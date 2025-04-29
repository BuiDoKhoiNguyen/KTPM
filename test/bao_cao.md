# Báo cáo so sánh hiệu năng giữa code cũ và code mới

## 1. Tổng quan
Báo cáo này so sánh hiệu năng giữa phiên bản gốc (code cũ) và phiên bản nâng cấp (code mới) của hệ thống key-value store.

### 1.1. Phiên bản gốc (code cũ)
- Sử dụng SQLite3 trực tiếp
- Sử dụng long polling (setInterval) mỗi 2 giây
- Kiến trúc đơn giản, không có caching, không có xử lý lỗi tốt

### 1.2. Phiên bản nâng cấp (code mới)
- Sử dụng PostgreSQL với Sequelize ORM
- Sử dụng Redis cache
- Sử dụng Socket.IO cho cập nhật real-time
- Sử dụng Kafka cho kiến trúc Publisher-Subscriber
- Xử lý lỗi tập trung

## 2. Kết quả so sánh hiệu năng

### 2.1. Hiệu năng đọc dữ liệu (GET /get/:key)

| Metric | Code cũ | Code mới | Cải thiện (%) |
|--------|---------|-----------|---------------|
| Requests per second | 1822.83 | 1252.97 | -31.26% |
| Độ trễ trung bình (ms) | 54.86 | 79.81 | -45.48% |
| Độ trễ P95 (ms) | 94 | 119 | -26.60% |

### 2.2. Hiệu năng ghi dữ liệu (POST /add)

| Metric | Code cũ | Code mới | Cải thiện (%) |
|--------|---------|-----------|---------------|
| Requests per second | 1112.16 | 160.38 | -85.58% |
| Độ trễ trung bình (ms) | 8.99 | 62.35 | -593.55% |
| Độ trễ P95 (ms) | 19 | 165 | -768.42% |

### 2.3. Độ trễ real-time

| Metric | Long polling (Code cũ) | Socket.IO (Code mới) | Cải thiện (%) |
|--------|----------------------|---------------------|---------------|
| Độ trễ trung bình (ms) | 2155.30 | 15.27 | 99.29% |
| Độ trễ trung vị (ms) | 2145 | 13 | 99.39% |
| Độ trễ P95 (ms) | 2306 | 28 | 98.79% |

### 2.4. Hiệu quả của Redis Cache

| Metric | Cache Miss (ms) | Cache Hit (ms) | Cải thiện (%) |
|--------|----------------|----------------|---------------|
| Độ trễ trung bình | 5.95 | 2.35 | 60.50% |
| Độ trễ trung vị | 6 | 2 | 66.67% |
| Độ trễ P95 | 10 | 3 | 70.00% |

## 3. Phân tích kết quả

### 3.1. Hiệu năng đọc dữ liệu
Hiệu năng đọc dữ liệu của code mới thấp hơn code cũ, với số lượng request/giây giảm 31.26% và độ trễ tăng 45.48%. Điều này có thể do:

- Kiến trúc phức tạp hơn với nhiều lớp (ORM, Redis, PostgreSQL)
- Overhead của việc kết nối đến PostgreSQL thay vì SQLite3
- Xử lý lỗi và logging chi tiết hơn

Tuy nhiên, khi xem xét hiệu quả của Redis Cache, ta thấy rằng cache hit có thể cải thiện thời gian phản hồi lên đến 60.50%. Điều này cho thấy trong trường hợp thực tế với nhiều request đọc lặp lại, code mới sẽ có hiệu năng tốt hơn.

### 3.2. Hiệu năng ghi dữ liệu
Hiệu năng ghi dữ liệu của code mới thấp hơn đáng kể so với code cũ, với số lượng request/giây giảm 85.58% và độ trễ tăng 593.55%. Điều này có thể do:

- Kiến trúc Publisher-Subscriber với Kafka tạo ra overhead
- Việc cập nhật đồng thời vào PostgreSQL và Redis
- Xử lý transaction và rollback trong trường hợp lỗi

Tuy nhiên, kiến trúc Publisher-Subscriber mang lại lợi ích về khả năng mở rộng và độ tin cậy, đặc biệt trong các hệ thống phân tán.

### 3.3. Độ trễ real-time
Đây là điểm mạnh nhất của code mới. Việc thay thế long polling bằng Socket.IO đã giúp giảm đáng kể độ trễ real-time, từ 2155.30ms xuống còn 15.27ms, tương đương với cải thiện 99.29%. Điều này mang lại trải nghiệm người dùng tốt hơn nhiều, đặc biệt là trong các ứng dụng cần cập nhật theo thời gian thực.

### 3.4. Hiệu quả của Redis Cache
Redis cache đã giúp cải thiện thời gian phản hồi lên đến 60.50% đối với các truy vấn đọc dữ liệu. Điều này cho thấy việc sử dụng Redis cache là một chiến lược hiệu quả để tối ưu hóa hiệu năng đọc dữ liệu.

## 4. Kết luận và đề xuất

### 4.1. Kết luận
Phiên bản nâng cấp (code mới) có những ưu điểm và nhược điểm so với phiên bản gốc (code cũ):

**Ưu điểm:**
- Cải thiện đáng kể độ trễ real-time (99.29%)
- Hiệu quả cao của Redis cache (60.50%)
- Kiến trúc mở rộng và đáng tin cậy hơn
- Xử lý lỗi tốt hơn

**Nhược điểm:**
- Hiệu năng đọc/ghi dữ liệu thuần túy thấp hơn
- Kiến trúc phức tạp hơn, khó bảo trì hơn
- Chi phí vận hành cao hơn

Mặc dù code mới có hiệu năng đọc và ghi dữ liệu thấp hơn, nhưng nó mang lại cải thiện đáng kể về độ trễ real-time và hiệu quả cache. Trong các ứng dụng cần cập nhật theo thời gian thực như theo dõi giá vàng, tỷ giá tiền tệ, v.v., độ trễ real-time là yếu tố quan trọng nhất.

Ngoài ra, kiến trúc của code mới cũng mang lại nhiều lợi ích về khả năng mở rộng, độ tin cậy và bảo trì. Vì vậy, tùy thuộc vào yêu cầu cụ thể của ứng dụng, code mới có thể là lựa chọn tốt hơn mặc dù có hiệu năng thuần túy thấp hơn trong một số trường hợp
