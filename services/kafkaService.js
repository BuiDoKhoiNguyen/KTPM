// services/pubsub/kafka.js
const { Kafka } = require('kafkajs');
const socketService = require('./socketService'); 
const retry = require('../utils/retry');

// Khởi tạo Kafka một lần duy nhất
const kafka = new Kafka({
  clientId: 'ktpm-app',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

// Tạo producer và consumer
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'ktpm-consumer-group' });

let isConnected = false;

// Hàm kết nối Kafka với retry
async function connect() {
  if (isConnected) return;
  
  try {
    // Kết nối producer với retry pattern
    await retry(async () => {
      await producer.connect();
      console.log('Kafka producer connected');
    }, {
      retries: 5,
      delay: 1000,
      onRetry: (error, attempt) => {
        console.log(`Producer connection attempt ${attempt} failed: ${error.message}. Retrying...`);
      }
    });

    // Kết nối consumer với retry pattern
    await retry(async () => {
      await consumer.connect();
      console.log('Kafka consumer connected');
    }, {
      retries: 5,
      delay: 1000,
      onRetry: (error, attempt) => {
        console.log(`Consumer connection attempt ${attempt} failed: ${error.message}. Retrying...`);
      }
    });
    
    const topicName = process.env.KAFKA_TOPIC || 'data-events';
    
    // Subscribe topic
    await consumer.subscribe({ 
      topic: topicName, 
      fromBeginning: false 
    });
    console.log(`Subscribed to topic ${topicName}`);
    
    // Khởi chạy consumer
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`Received message: ${message.value.toString()}`);
          
          // Broadcast tới Socket.IO
          socketService.broadcastUpdate(data);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      }
    });
    
    isConnected = true;
    console.log('Kafka connected successfully');
  } catch (error) {
    console.error('Failed to connect to Kafka:', error);
    throw error;
  }
}

// Cập nhật function publishUpdate để sử dụng một topic chung
async function publishUpdate(key, value) {
  return await retry(async () => {
    if (!producer.isConnected) {
      await producer.connect();
    }
    
    // Sử dụng topic chung từ biến môi trường hoặc mặc định
    const topic = process.env.KAFKA_TOPIC || 'data-events';
    
    await producer.send({
      topic,
      messages: [
        { 
          // Sử dụng key để đảm bảo tất cả messages của cùng một key 
          // sẽ đi vào cùng một partition (duy trì thứ tự)
          key: key,
          value: JSON.stringify({
            key,
            value,
            timestamp: Date.now()
          })
        }
      ]
    });
    
    console.log(`Published update for key "${key}" to Kafka topic "${topic}"`);
    return true;
  }, {
    retries: 3,
    delay: 500,
    onRetry: (error, attempt) => {
      console.warn(`Retry #${attempt} publishing to Kafka: ${error.message}`);
    }
  });
}

// Export module
module.exports = {
  connect,
  producer,
  publishUpdate
};