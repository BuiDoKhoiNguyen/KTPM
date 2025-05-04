const Data = require('../models/data');
const { cacheUtils, pubSubUtils } = require('../config/redis');
const retry = require('../utils/retry');

const CACHE_TTL = parseInt(process.env.REDIS_TTL || 600);

async function writeData(key, value) {
  try {
    await Data.upsert({
      key: key,
      value: value,
      updatedAt: new Date(),
    });

    const message = {
      key,
      value,
      timestamp: Date.now()
    };
    
    await cacheUtils.setCache(`data:${key}`, value, CACHE_TTL)
    await pubSubUtils.publish('data-updates', message)
    return true;
  } catch (error) {
    console.error('Database error:', error.message);
    throw error;
  }
}

async function readData(key) {  
  try {
    // Thử lấy dữ liệu từ cache trước
    const cacheValue = await cacheUtils.getCache(`data:${key}`);

    if (cacheValue) {
      return {
        value: cacheValue,
        updatedAt: Date.now(),
        source: 'cache'
      };
    }

    const data = await retry(async () => {
      return await Data.findByPk(key, { raw: true });
    }, {
      retries: 1, 
      delay: 100   
    });

    if (!data) {
      return null; 
    }
    
    await cacheUtils.setCache(`data:${key}`, data.value, CACHE_TTL);
    
    return {
      value: data.value,
      updatedAt: data.updatedAt,
      source: 'database'
    };
  } catch (error) {
    console.error('Data read error:', error.message);
    throw error;
  }
}

async function getAllKeys() {
  try {
    const allData = await Data.findAll({
      attributes: ['key'],
      order: [['updatedAt', 'DESC']],
      raw: true
    });
    
    const keys = allData.map(item => item.key);
    return keys;
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
}

module.exports = {
  writeData,
  readData,
  getAllKeys
};