require('dotenv').config();
const sequelize = require('../config/database');

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Kết nối đến database thành công');

    await sequelize.sync({ alter: true });
    console.log('Đã đồng bộ hóa các model với database');

    console.log('Khởi tạo database hoàn tất');
    return true;
  } catch (error) {
    console.error('Lỗi khởi tạo database:', error);
    console.error('Chi tiết lỗi:', error.parent || error);
    return false;
  }
}

module.exports = { initializeDatabase };