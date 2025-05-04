const rateLimit = require("express-rate-limit")

const postLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many requests",
    message: "Quá nhiều yêu cầu cập nhật dữ liệu. Vui lòng thử lại sau.",
  },
})

const getLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 50, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many requests",
    message: "Quá nhiều yêu cầu đọc dữ liệu. Vui lòng thử lại sau.",
  },
})

module.exports = {
  postLimiter,
  getLimiter,
}
