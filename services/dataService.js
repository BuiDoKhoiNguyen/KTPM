const { Data } = require('../models');
const { publishUpdate } = require('./kafkaService');
const { sequelize } = require('../models');
const { cacheUtils } = require('../config/redis');
const retry = require('../utils/retry');

const CACHE_TTL = parseInt(process.env.REDIS_TTL || 600);

// Write data với retry pattern cho thao tác quan trọng
async function writeData(key, value) {
  const transaction = await sequelize.transaction();
  
  try {
    // Tìm giá trị hiện tại (nếu có)
    const existingData = await Data.findByPk(key, { transaction });
    const action = existingData ? 'UPDATE' : 'CREATE';
    
    // 1. Save to database using ORM
    await Data.upsert({
      key: key,
      value: value,
      updatedAt: new Date(),
    }, { transaction });
    
    // 2. Publish to Kafka với retry pattern
    // Sử dụng hàm publishUpdate đã tích hợp retry để gửi message
    await publishUpdate(key, value);
    
    await transaction.commit();
    
    // 3. Cập nhật dữ liệu vào Redis cache
    // Cache không quan trọng, nếu lỗi thì có thể bỏ qua
    try {
      await cacheUtils.setCache(`data:${key}`, value, CACHE_TTL);
      await cacheUtils.deleteCache('all:keys');
    } catch (error) {
      console.warn('Redis cache error, continuing without cache:', error.message);
    }
    
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('Error writing data:', error);
    throw error;
  }
}

// Read data với timeout và các xử lý lỗi tốt hơn
async function readData(key) {
  let cacheError = null;
  
  try {
    // Kiểm tra cache trước
    try {
      const cachedValue = await cacheUtils.getCache(`data:${key}`);
      if (cachedValue) {
        // Lấy thông tin updatedAt từ database để có thời gian chính xác
        const data = await Data.findByPk(key, {
          attributes: ['updatedAt']
        });
        
        return {
          value: cachedValue,
          updatedAt: data ? data.updatedAt : null,
          source: 'cache'
        };
      }
    } catch (error) {
      // Lưu lỗi nhưng tiếp tục để có thể lấy từ database
      cacheError = error;
      console.warn('Cache read error, falling back to database:', error.message);
    }
    
    // Cache miss hoặc lỗi cache - lấy từ database
    // Thêm retry cho thao tác đọc từ database
    const data = await retry(async () => {
      return await Data.findByPk(key);
    }, {
      retries: 2,
      delay: 300,
      onRetry: (err, attempt) => {
        console.warn(`Database read retry #${attempt} for key ${key}: ${err.message}`);
      }
    });
    
    if (!data) return null;
    
    // Lưu vào cache nếu cache hoạt động
    if (!cacheError) {
      try {
        await cacheUtils.setCache(`data:${key}`, data.value, CACHE_TTL);
      } catch (err) {
        console.warn('Failed to update cache:', err.message);
      }
    }
    
    return {
      value: data.value,
      updatedAt: data.updatedAt,
      source: 'database'
    };
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
}

// Get all keys
async function getAllKeys() {
  try {
    // Kiểm tra cache trước
    try {
      const cachedKeys = await cacheUtils.getCache('all:keys');
      if (cachedKeys) {
        return JSON.parse(cachedKeys);
      }
    } catch (error) {
      console.warn('Cache error when getting keys, using database:', error.message);
    }
    
    // Cache miss hoặc lỗi - lấy từ database
    // Thêm retry cho việc lấy tất cả keys
    const allData = await retry(async () => {
      return await Data.findAll({
        attributes: ['key'],
        order: [['updatedAt', 'DESC']]
      });
    }, {
      retries: 2,
      delay: 500
    });
    
    const keys = allData.map(item => item.key);
    
    // Lưu vào cache
    try {
      await cacheUtils.setCache('all:keys', JSON.stringify(keys), 60);
    } catch (error) {
      console.warn('Failed to cache keys:', error.message);
    }
    
    return keys;
  } catch (error) {
    console.error('Error getting all keys:', error);
    throw error;
  }
}

module.exports = {
  writeData,
  readData,
  getAllKeys
};