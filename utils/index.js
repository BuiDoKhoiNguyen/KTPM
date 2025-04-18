/**
 * Các hàm tiện ích cho ứng dụng
 */

/**
 * Format thời gian thành chuỗi dễ đọc
 * @param {Date} date - Đối tượng Date
 * @returns {string} - Chuỗi thời gian đã định dạng
 */
function formatDate(date) {
  return new Date(date).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Xử lý lỗi và chuyển đổi thành đối tượng lỗi chuẩn
 * @param {Error} error - Đối tượng lỗi
 * @param {number} statusCode - Mã trạng thái HTTP
 * @returns {Error} - Đối tượng lỗi với thông tin bổ sung
 */
function createError(error, statusCode = 500) {
  if (typeof error === 'string') {
    error = new Error(error);
  }
  error.statusCode = statusCode;
  return error;
}

/**
 * Ghi log với cấp độ khác nhau
 * @param {string} message - Thông điệp cần ghi log
 * @param {string} level - Cấp độ log (info, warn, error)
 */
function logger(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'error':
      console.error(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
}

module.exports = {
  formatDate,
  createError,
  logger
};