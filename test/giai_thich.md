Công cụ sử dụng: Apache Benchmark (ab), Socket.IO Testing Script, Redis Cache Testing Script, Long Polling Testing Script
Kịch bản kiểm thử: Số lượng requests, concurrent users, và các kịch bản cụ thể
Môi trường kiểm thử: Thông tin về hệ thống và môi trường
Kết quả đánh giá hiệu năng:
Hiệu năng đọc dữ liệu: So sánh throughput và độ trễ
Hiệu năng ghi dữ liệu: So sánh throughput và độ trễ
Độ trễ real-time: So sánh long polling và Socket.IO
Hiệu quả của Redis Cache: So sánh cache hit và cache miss




Kết luận chính 
Hiệu năng đọc/ghi dữ liệu: Code mới có hiệu năng thấp hơn code cũ, nhưng mang lại nhiều lợi ích khác như khả năng mở rộng và độ tin cậy cao hơn.
Độ trễ real-time: Code mới có độ trễ real-time thấp hơn đáng kể (cải thiện 99.29%) nhờ việc sử dụng Socket.IO thay cho long polling.
Hiệu quả của Redis Cache: Redis cache giúp cải thiện thời gian phản hồi lên đến 60.50% đối với các truy vấn đọc dữ liệu.
Trade-off: Code mới đánh đổi hiệu năng thuần túy để lấy khả năng mở rộng, độ tin cậy và trải nghiệm người dùng tốt hơn.


Lý do code mới có hiệu năng đọc/ghi dữ liệu thấp hơn
1. Kiến trúc phức tạp hơn
Code cũ: Sử dụng SQLite3 trực tiếp, đơn giản và nhẹ
Code mới: Sử dụng kiến trúc nhiều lớp (PostgreSQL + Sequelize ORM + Redis + Kafka)
Mỗi lớp trong kiến trúc mới đều tạo ra overhead. Khi một request đến:

Phải đi qua nhiều lớp middleware
Sequelize ORM tạo ra overhead so với truy vấn SQL trực tiếp
Kết nối đến PostgreSQL phức tạp hơn SQLite3
Kafka tạo ra độ trễ khi xử lý message
2. Tính năng phong phú hơn
Code cũ: Chỉ thực hiện chức năng cơ bản (đọc/ghi)
Code mới: Thêm nhiều tính năng như:
Xử lý lỗi chi tiết
Logging
Transaction và rollback
Caching
Pub/Sub với Kafka
Các tính năng bổ sung này tạo ra overhead nhưng mang lại độ tin cậy và khả năng mở rộng cao hơn.

3. Trường hợp đặc biệt của SQLite3
SQLite3 được tối ưu hóa cho hiệu năng đọc/ghi trên một máy đơn, đặc biệt là khi chạy trên localhost. Nó không phải thiết kế cho hệ thống phân tán hoặc nhiều người dùng đồng thời ở quy mô lớn.



Đánh giá tính công bằng của bài test
1. Bài test chưa hoàn toàn công bằng vì:
Môi trường test: Chạy trên localhost, SQLite3 có lợi thế lớn
Quy mô test: Nhỏ, chưa thể hiện được ưu điểm của kiến trúc mới trong môi trường thực tế
Số lượng concurrent users: Chưa đủ lớn để thể hiện vấn đề của SQLite3 khi có nhiều kết nối đồng thời
Không test khả năng mở rộng: Chưa test với nhiều instance hoặc distributed environment
2. Bài test chưa đánh giá đầy đủ các trường hợp:
Cache hit ratio thực tế: Trong thực tế, tỷ lệ cache hit có thể cao hơn nhiều
Tải liên tục: Chưa test hiệu năng khi hệ thống chạy liên tục trong thời gian dài
Khả năng phục hồi: Chưa test khả năng phục hồi sau lỗi
