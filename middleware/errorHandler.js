/**
 * Middleware xử lý lỗi tập trung cho ứng dụng
 */

// Middleware xử lý lỗi tập trung
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message, err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Đã xảy ra lỗi không xác định';
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Middleware bắt lỗi 404 (Không tìm thấy tài nguyên)
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Không tìm thấy: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};