/**
 * Tệp này chịu trách nhiệm khởi tạo database và các bảng cần thiết
 */
require('dotenv').config();
const sequelize = require('../config/database');
const { Data } = require('../models');

async function initializeDatabase() {
  try {
    // Xác thực kết nối đến database
    await sequelize.authenticate();
    console.log('Kết nối đến database thành công');

    // Đồng bộ hóa các model với database (tạo bảng nếu chưa tồn tại)
    // Sử dụng force: true cho lần chạy đầu tiên để đảm bảo bảng được tạo mới
    // Sau đó có thể đổi thành force: false
    await sequelize.sync({ alter: true });
    console.log('Đã đồng bộ hóa các model với database');

    // Kiểm tra xem đã có dữ liệu mẫu chưa
    const dataCount = await Data.count();
    
    // Nếu chưa có dữ liệu, thêm một số dữ liệu mẫu
    if (dataCount === 0) {
      await Data.bulkCreate([
        { key: 'sample1', value: 'Hello World!' },
        { key: 'sample2', value: '42' },
        { key: 'sample3', value: '{"type": "json", "active": true}' }
      ]);
      console.log('Đã thêm dữ liệu mẫu');
    } else {
      console.log(`Dữ liệu đã tồn tại (${dataCount} bản ghi)`);
    }

    console.log('Khởi tạo database hoàn tất');
    return true;
  } catch (error) {
    console.error('Lỗi khởi tạo database:', error);
    console.error('Chi tiết lỗi:', error.parent || error);
    return false;
  }
}

// Nếu file được chạy trực tiếp
if (require.main === module) {
  initializeDatabase()
    .then(success => {
      if (success) {
        console.log('Khởi tạo database thành công');
      } else {
        console.error('Khởi tạo database thất bại');
      }
      process.exit(success ? 0 : 1);
    });
} else {
  // Nếu được import
  module.exports = { initializeDatabase };
}