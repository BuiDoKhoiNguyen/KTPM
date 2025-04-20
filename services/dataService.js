const { Data, DataHistory } = require('../models');
const { producer } = require('./kafkaService');
const { sequelize } = require('../models');
const { cacheUtils } = require('../config/redis');

const CACHE_TTL = parseInt(process.env.REDIS_TTL || 600);

// Write data
async function writeData(key, value) {
  const transaction = await sequelize.transaction();
  
  try {
    // Tìm giá trị hiện tại (nếu có)
    const existingData = await Data.findByPk(key, { transaction });
    const oldValue = existingData ? existingData.value : null;
    const action = existingData ? 'UPDATE' : 'CREATE';
    
    // 1. Save to database using ORM
    await Data.upsert({
      key: key,
      value: value,
      updatedAt: new Date(),
    }, { transaction });
    
    // 2. Ghi lại lịch sử thay đổi
    await DataHistory.create({
      key,
      oldValue,
      newValue: value,
      action,
      timestamp: new Date()
    }, { transaction });
    
    // 3. Publish to Kafka
    const topicName = process.env.KAFKA_TOPIC || 'data-events';
    await producer.send({
      topic: topicName,
      messages: [{ 
        key: key,
        value: JSON.stringify({ 
          key, 
          value, 
          action,
          timestamp: Date.now() 
        }) 
      }]
    });
    
    await transaction.commit();
    
    // 4. Cập nhật dữ liệu vào Redis cache
    await cacheUtils.setCache(`data:${key}`, value, CACHE_TTL);
    // Xóa cache danh sách keys để đảm bảo lấy được danh sách mới nhất
    await cacheUtils.deleteCache('all:keys');
    
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('Error writing data:', error);
    throw error;
  }
}

// Read data
async function readData(key) {
  try {
    // Kiểm tra cache trước
    const cachedValue = await cacheUtils.getCache(`data:${key}`);
    if (cachedValue) {
      return cachedValue;
    }
    
    // Cache miss - lấy từ database
    const data = await Data.findByPk(key);
    if (!data) return null;
    
    // Lưu vào cache với TTL
    await cacheUtils.setCache(`data:${key}`, data.value, CACHE_TTL);
    return data.value;
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
}

// Get data history
async function getDataHistory(key, limit = 10) {
  try {
    // Kiểm tra cache trước
    const cacheKey = `history:${key}:${limit}`;
    const cachedHistory = await cacheUtils.getCache(cacheKey);
    
    if (cachedHistory) {
      return JSON.parse(cachedHistory);
    }
    
    // Cache miss - lấy từ database
    const history = await DataHistory.findAll({
      where: { key },
      limit,
      order: [['timestamp', 'DESC']],
    });
    
    // Lưu vào cache với TTL ngắn hơn (5 phút) vì history có thể thay đổi
    await cacheUtils.setCache(cacheKey, JSON.stringify(history), 300);
    
    return history;
  } catch (error) {
    console.error('Error fetching data history:', error);
    throw error;
  }
}

// Get all keys
async function getAllKeys() {
  try {
    // Kiểm tra cache trước
    const cachedKeys = await cacheUtils.getCache('all:keys');
    if (cachedKeys) {
      return JSON.parse(cachedKeys);
    }
    
    // Cache miss - lấy từ database
    const allData = await Data.findAll({
      attributes: ['key'],
      order: [['updatedAt', 'DESC']]
    });
    
    const keys = allData.map(item => item.key);
    
    await cacheUtils.setCache('all:keys', JSON.stringify(keys), 60);
    
    return keys;
  } catch (error) {
    console.error('Error getting all keys:', error);
    throw error;
  }
}

module.exports = {
  writeData,
  readData,
  getDataHistory,
  getAllKeys
};