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

const notFoundHandler = (req, res, next) => {
  const error = new Error(`Không tìm thấy: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};