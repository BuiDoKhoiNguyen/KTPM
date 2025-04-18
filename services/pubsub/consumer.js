const { Kafka } = require('kafkajs');
const socketService = require('../socketService');

const kafka = new Kafka({
  clientId: 'ktpm-consumer',
  brokers: ['localhost:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const consumer = kafka.consumer({ groupId: 'ktpm-updates-group' });

// Khởi tạo consumer
async function initConsumer() {
  await consumer.connect();
  
  // Subscribe vào tất cả topics theo pattern
  await consumer.subscribe({ 
    topics: [/^updates-.*/], 
    fromBeginning: false
  });
  
  // Process messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const key = topic.substring(8); // Lấy key từ topic (updates-{key})
        const data = JSON.parse(message.value.toString());
        
        console.log(`Consumer received update for key ${key}:`, data);
        
        // Emit update thông qua Socket.IO
        socketService.emitUpdate(key, data.value);
      } catch (error) {
        console.error('Error processing Kafka message:', error);
      }
    }
  });
  
  return consumer;
}

module.exports = {
  consumer,
  initConsumer
};