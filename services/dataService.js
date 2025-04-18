const { Data, DataHistory } = require('../models');
const { producer } = require('./pubsub');
const { sequelize } = require('../models');

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
    const data = await Data.findByPk(key);
    return data ? data.value : null;
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
}

// Get data history
async function getDataHistory(key, limit = 10) {
  try {
    const history = await DataHistory.findAll({
      where: { key },
      limit,
      order: [['timestamp', 'DESC']],
    });
    
    return history;
  } catch (error) {
    console.error('Error fetching data history:', error);
    throw error;
  }
}

module.exports = {
  writeData,
  readData,
  getDataHistory
};