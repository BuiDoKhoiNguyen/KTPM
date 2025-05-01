# Key-Value Real-time System (KTPM-BTL)

Hệ thống lưu trữ và cập nhật key-value thời gian thực, được thiết kế để hỗ trợ dữ liệu cập nhật liên tục như giá vàng, Bitcoin, cổ phiếu,... với khả năng mở rộng theo chiều ngang thông qua Docker instances.

## Tính năng chính

- **Lưu trữ key-value**: Lưu trữ và truy xuất dữ liệu theo cặp key-value
- **Cập nhật thời gian thực**: Dữ liệu được cập nhật và đẩy tới người dùng ngay lập tức
- **Dashboard quản lý**: Giao diện trực quan để quản lý các key-value
- **Viewer theo dõi**: Trang web để theo dõi giá trị theo thời gian thực
- **Mở rộng theo chiều ngang**: Hỗ trợ triển khai nhiều instances với Docker
- **Caching**: Redis cache để tối ưu hiệu năng truy vấn
- **Pattern Developer**: Rate Limiting, Retry, Publisher/Subscriber, Cache-Aside

## Công nghệ sử dụng

- **Back-end framework**: Express.js
- **Realtime communication**: Socket.IO với Redis adapter
- **Message broker**: Kafka, Zookeeper
- **Database**: PostgreSQL với Sequelize ORM
- **Caching**: Redis
- **Containerization**: Docker, Docker Compose
- **Load balancing**: Nginx
- **Web technologies**: HTML5, CSS3, JavaScript

## Kiến trúc hệ thống

```
[Client] <--Socket.IO--> [Nginx Load Balancer] <---> [App Instance 1..N]
    |                           |                        |
    |                           |                        v
    |                           |                 [Data Service]
    |                           |                        |
    |                           |         +--------------+--------------+
    |                           |         |                             |
    |                           |         v                             v
    |                           |   [Kafka Producer]             [Redis Cache] <--> [PostgreSQL]
    |                           |         |                             ^
    |                           |         v                             |
    |                           |   [Kafka Broker]                      |
    |                           |         |                             |
    |                           |         v                             |
    |                           |   [Kafka Consumer]                    |
    |                           |         |                             |
    v                           v         v                             |
[Socket.IO] <---------------- [App Instance 1..N] ---------------------+
    |
    v
[Browser]
```

### Luồng dữ liệu
1. **Write flow**: Client → API → PostgreSQL → Redis Cache → Kafka → Socket.IO → Clients
2. **Read flow**: Client → Redis Cache (nếu hit) → PostgreSQL (nếu cache miss) → Client
3. **Realtime updates**: Kafka → Consumers → Socket.IO → Clients

## Hướng dẫn cài đặt

### Yêu cầu hệ thống
- Docker và Docker Compose
- Node.js (16.x hoặc cao hơn)
- npm/yarn

### Cài đặt và chạy

#### 1. Clone repository
```bash
git clone <repository-url>
cd KTPM-btl
```

#### 2. Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc:

```
PORT=8080

# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ktpm_db
DB_PORT=5432

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=data-events

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=600
```

#### 3. Khởi chạy các dịch vụ phụ trợ (PostgreSQL, Redis, Kafka)
```bash
docker-compose up -d
```

#### 4. Cài đặt các dependencies
```bash
npm install
```

#### 5. Khởi chạy ứng dụng

**Chạy một instance (development mode):**
```bash
npm start
```

#### 6. Truy cập ứng dụng
- **Dashboard quản lý**: http://localhost/admin
- **Viewer thời gian thực**: http://localhost/viewer/{key}
- **Kafka UI**: http://localhost:9090

## API Endpoints

| Endpoint         | Phương thức | Mô tả                                       |
|------------------|:-----------:|---------------------------------------------|
| `/add`           | POST        | Thêm/cập nhật giá trị key                   |
| `/get/:key`      | GET         | Lấy giá trị hiện tại của key                |
| `/keys`          | GET         | Lấy danh sách tất cả các key                |
| `/viewer/:key`   | GET         | Trang web theo dõi giá trị theo thời gian thực |
| `/admin`         | GET         | Dashboard quản lý key-value                |


## Design Pattern đã triển khai

1. **Publisher/Subscriber**: Sử dụng Kafka và Socket.IO để truyền cập nhật giá trị
   - Mỗi update được publish lên Kafka và subscribe bởi tất cả các instances

2. **Cache-Aside**: Đọc dữ liệu từ Redis cache trước, chỉ truy vấn database khi cache miss
   - Cập nhật cache sau khi đọc từ database (read-through)
   - Cập nhật cache khi ghi vào database (write-through)

3. **Retry Pattern**: Xử lý kết nối không ổn định với các dịch vụ khác
   - Áp dụng cho kết nối database, Kafka, và Redis
   - Sử dụng exponential backoff để tránh quá tải

## Kiến trúc mở rộng với Docker

Dự án được thiết kế để dễ dàng mở rộng với Docker:

1. **Load balancing**: Nginx phân phối traffic giữa các app instances
   - Sử dụng `ip_hash` để đảm bảo sticky sessions cho WebSocket
   - Cân bằng tải giữa các instances

2. **Shared state**: Redis và Kafka đồng bộ trạng thái giữa các instances
   - Redis adapter cho Socket.IO
   - Kafka cho phân phối messages

3. **Stateless design**: Các app instances không lưu trữ trạng thái
   - Dễ dàng thêm/bớt instances theo nhu cầu
   - Không bị mất dữ liệu khi một instance gặp sự cố
