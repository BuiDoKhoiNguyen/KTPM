const sequelize = require('../config/database');
const defineDataModel = require('./data');
const defineDataHistoryModel = require('./data-history');
// Đã loại bỏ import User model

// Khởi tạo models
const Data = defineDataModel(sequelize);
const DataHistory = defineDataHistoryModel(sequelize);
// Đã loại bỏ khởi tạo User model

// Không còn quan hệ với User model nữa

// Đồng bộ models với database
const initializeModels = async () => {
  try {
    await sequelize.sync();
    console.log('Models synchronized with database');
  } catch (err) {
    console.error('Failed to sync models:', err);
    throw err;
  }
};

module.exports = {
  sequelize,
  Data,
  DataHistory,
  // Đã loại bỏ User từ exports
  initializeModels
};