# Key-Value Real-time System (KTPM-BTL)

Hệ thống lưu trữ và cập nhật key-value thời gian thực với khả năng mở rộng cao, được thiết kế đặc biệt cho dữ liệu cần cập nhật liên tục như giá vàng, Bitcoin, cổ phiếu và các thông tin tài chính theo thời gian thực khác.

## 📋 Tổng quan

KTPM-BTL là một hệ thống key-value hiện đại được xây dựng với kiến trúc microservices, hỗ trợ:
- Lưu trữ và truy xuất dữ liệu theo cặp key-value
- Cập nhật và đồng bộ dữ liệu theo thời gian thực
- Khả năng mở rộng theo chiều ngang thông qua Docker
- Hiệu suất cao với Redis caching

## ✨ Tính năng chính

- **Quản lý key-value**: API đơn giản để lưu trữ, cập nhật và truy xuất dữ liệu
- **Cập nhật thời gian thực**: Dữ liệu được đẩy đến clients ngay lập tức khi có thay đổi
- **Dashboard quản lý**: Giao diện trực quan cho người quản trị
- **Viewer theo dõi**: Trang theo dõi giá trị theo thời gian thực cho người dùng
- **Khả năng mở rộng cao**: Hỗ trợ triển khai nhiều instances với Docker
- **Caching thông minh**: Redis cache giảm tải database và tối ưu hiệu năng truy vấn
- **Mẫu thiết kế hiện đại**: Rate Limiting, Retry Pattern, Publisher/Subscriber, Cache-Aside

## 🛠 Công nghệ sử dụng

| Công nghệ | Chi tiết |
|-----------|----------|
| **Back-end** | Express.js |
| **Realtime** | Socket.IO với Redis adapter |
| **Message Broker** | Redis PubSub |
| **Database** | PostgreSQL với Sequelize ORM |
| **Caching** | Redis |
| **Containerization** | Docker, Docker Compose |
| **Load Balancing** | Nginx |
| **Front-end** | HTML5, CSS3, JavaScript |

## 🏗 Kiến trúc hệ thống

```
[Client] <--Socket.IO--> [Nginx Load Balancer] <---> [App Instance 1..N]
    |                           |                        |
    |                           |                        v
    |                           |                 [Data Service]
    |                           |                        |
    |                           |         +--------------+--------------+
    |                           |         |                             |
    |                           |         v                             v
    |                           |   [Redis PubSub]                [Redis Cache] <--> [PostgreSQL]
    |                           |         |                             ^
    |                           |         v                             |
    |                           |   [PubSub Broker]                     |
    |                           |         |                             |
    |                           |         v                             |
    |                           |   [PubSub Consumer]                   |
    |                           |         |                             |
    v                           v         v                             |
[Socket.IO] <---------------- [App Instance 1..N] ---------------------+
    |
    v
[Browser]
```

### Luồng dữ liệu
1. **Write flow**: Client → API → PostgreSQL → Redis Cache → Redis PubSub → Socket.IO → Clients
2. **Read flow**: Client → Redis Cache (nếu hit) → PostgreSQL (nếu cache miss) → Client
3. **Realtime updates**: Redis PubSub → Consumers → Socket.IO → Clients

## 📦 Yêu cầu hệ thống

- Docker và Docker Compose
- Node.js (16.x hoặc cao hơn)
- npm hoặc yarn

## 🚀 Cài đặt và chạy

### 1. Clone repository
```bash
git clone <repository-url>
cd KTPM-btl
```

### 2. Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc với nội dung:

```
PORT=8080

# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ktpm_db
DB_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=600
```

### 3. Khởi chạy các dịch vụ phụ trợ
```bash
docker-compose up -d
```

### 4. Cài đặt các dependencies
```bash
npm install
```

### 5. Khởi chạy ứng dụng

#### Development mode (một instance)
```bash
npm run dev
```

#### Production mode (với Docker)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 6. Truy cập ứng dụng
- **Dashboard quản lý**: http://localhost/admin
- **Viewer thời gian thực**: http://localhost/viewer/{key}
- **Redis UI**: http://localhost:8081

## 📡 API Endpoints

| Endpoint | Method | Mô tả | Payload/Params |
|----------|:------:|-------|---------------|
| `/add` | POST | Thêm/cập nhật giá trị key | `{ key: string, value: any }` |
| `/get/:key` | GET | Lấy giá trị hiện tại | `key`: tên key cần truy vấn |
| `/keys` | GET | Lấy danh sách tất cả keys | - |
| `/viewer/:key` | GET | Trang theo dõi thời gian thực | `key`: tên key cần theo dõi |
| `/admin` | GET | Dashboard quản lý key-value | - |

## 🧩 Design Pattern

### 1. Publisher/Subscriber
- Sử dụng Redis PubSub để truyền cập nhật giá trị
- Mỗi update được publish và subscribe bởi tất cả instances
- Đảm bảo đồng bộ dữ liệu trên nhiều instances

### 2. Cache-Aside
- Đọc dữ liệu từ Redis cache trước, chỉ truy vấn database khi cache miss
- Cache được cập nhật sau khi đọc từ database (read-through)
- Cache được cập nhật khi ghi vào database (write-through)

### 3. Retry Pattern
- Xử lý kết nối không ổn định với các dịch vụ khác
- Áp dụng cho kết nối database, Redis PubSub
- Sử dụng exponential backoff để tránh quá tải hệ thống

### 4. Rate Limiting
- Giới hạn số lượng request từ một client trong một khoảng thời gian
- Bảo vệ hệ thống khỏi các tấn công DoS

## 🔄 Kiến trúc mở rộng

KTPM-BTL được thiết kế để dễ dàng mở rộng theo chiều ngang:

### 1. Load balancing với Nginx
- Phân phối traffic giữa các app instances
- Sử dụng `ip_hash` để đảm bảo sticky sessions cho WebSocket
- Tự động định tuyến request đến các instance khỏe mạnh

### 2. Shared state
- Redis đồng bộ trạng thái giữa các instances
- Redis adapter cho Socket.IO đảm bảo broadcast events đến tất cả instances
- Redis PubSub cho phân phối messages

### 3. Stateless design
- Các app instances không lưu trữ trạng thái
- Dễ dàng thêm/bớt instances theo nhu cầu
- Không mất dữ liệu khi một instance gặp sự cố

## 📊 So sánh hiệu năng với KTPM-base

KTPM-BTL cải thiện đáng kể hiệu năng so với KTPM-base:

| Metric | Cải thiện trung bình |
|--------|----------------------|
| Số lượng requests/giây | +15% |
| Độ trễ trung bình | -10% |
| Độ trễ P99 | -25% |
| Khả năng xử lý dữ liệu lớn | +30% |

*Kết quả đo từ bài kiểm tra với 500-1000 kết nối đồng thời

## 📖 Tài liệu tham khảo
- [Socket.IO Documentation](https://socket.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)

## 📝 License
MIT License

