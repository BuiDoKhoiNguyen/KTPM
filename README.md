# CASE STUDY 4
Dưới đây là một chương trình đơn giản sử dụng `express.js`, để ghi các giá trị vào database theo cặp key-value. Chương trình cung cấp một trang web liên tục cập nhật giá trị của key để gửi về kết quả mới, có thể được ứng dụng để cập nhật giá vàng, thông số theo *thời gian thực*. Chương trình có thể chưa hoàn toàn được tối ưu.

## Các công nghệ sử dụng
- **Express.js**: Web framework
- **Socket.IO**: Real-time communication 
- **Kafka**: Message broker cho kiến trúc Publisher-Subscriber
- **Sequelize**: ORM (Object-Relational Mapping) cho PostgreSQL
- **Docker**: Containerization cho Kafka và Zookeeper

## Hướng dẫn cài đặt và chạy
1. Cài đặt các phụ thuộc:
```sh
# Cài đặt toàn bộ và thiết lập môi trường
npm run setup
```

2. Nếu bạn muốn cài đặt thủ công, làm theo các bước sau:
```sh
# Cài đặt các gói liên quan
npm install

# Khởi động Kafka (yêu cầu Docker)
npm run kafka:up

# Khởi tạo cơ sở dữ liệu
npm run init-db

# Tạo topic Kafka (nếu cần)
npm run create-topic
```

3. Chạy ứng dụng:
```sh
# Chạy ứng dụng ở chế độ production
npm start

# Hoặc chạy ở chế độ development với nodemon
npm run dev
```

## Cấu hình môi trường
Tạo file `.env` ở thư mục gốc với nội dung như sau:
```
PORT=8080
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ktpm_database
DB_PORT=5432
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=data-events
```

## Mô Tả API
| Endpoint | Phương thức | Mục tiêu
|--|:--:|--|
| /add | POST | Thêm/chỉnh sửa giá trị trong database
| /get/:key | GET | Trả về giá trị của key
| /viewer/:key | GET | Trang web theo dõi giá trị của key
| /health | GET | Kiểm tra trạng thái hoạt động của API

## Xử lý message qua Kafka
Ứng dụng sử dụng Kafka để xử lý message theo mô hình Publisher-Subscriber:
- **Producer**: Khi có cập nhật giá trị thông qua API `/add`
- **Consumer**: Nhận các cập nhật và gửi đến clients qua Socket.IO

## Lịch sử nâng cấp
So với phiên bản gốc, phiên bản mới đã được nâng cấp với:
1. **Socket.IO** thay cho long polling để cải thiện hiệu suất và giảm tải server
2. **Lớp Persistent** sử dụng Sequelize ORM thay cho lưu trữ đơn giản
3. **Kiến trúc Publisher-Subscriber** với Kafka giúp mở rộng quy mô dễ dàng
4. **Xử lý lỗi tập trung** thông qua middleware
5. **Quản lý biến môi trường** thông qua dotenv

## Yêu cầu triển khai
| Mức độ | Mô tả | Trạng thái |
|--|--|--|
| ![Static Badge](https://img.shields.io/badge/OPTIONAL-medium-yellow)  | Tối ưu chương trình trên | ✅ |
| ![Static Badge](https://img.shields.io/badge/OPTIONAL-easy-green) | Bổ sung giao diện web hoàn chỉnh hơn | ⏳ |
| ![Static Badge](https://img.shields.io/badge/OPTIONAL-easy-green) | Thay thế cơ sở dữ liệu hiện tại | ✅ |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-easy-green) | Thay thế công nghệ sử dụng cho việc gọi request liên tục trong `viewer.html` (VD: socket.io, ...) | ✅ |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-medium-yellow) | Thêm lớp persistent bằng cách sử dụng ORM (Object-Relational Mapping) | ✅ |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-medium-yellow) | Triển khai theo kiến trúc Publisher-Subscriber và cài đặt message broker tuỳ chọn | ✅ |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-medium-yellow) | Nêu các vấn đề chương trình gốc đang gặp phải về các thuộc tính chất lượng và *đánh giá* hiệu năng sau khi nâng cấp | ⏳ |

Ngoài ra, các bạn có thể tuỳ chọn bổ sung thêm một số phần triển khai khác.

