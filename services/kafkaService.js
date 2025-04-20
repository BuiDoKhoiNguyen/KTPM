// services/pubsub/kafka.js
const { Kafka } = require('kafkajs');
const socketService = require('./socketService'); 

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

// Hàm kết nối Kafka
async function connect() {
  if (isConnected) return;
  
  try {
    await producer.connect();
    await consumer.connect();
    
    const topicName = process.env.KAFKA_TOPIC || 'data-events';
    
    // Subscribe topic
    await consumer.subscribe({ 
      topic: topicName, 
      fromBeginning: false 
    });
    
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

async function publishUpdate(key, value) {
  if (!producer.isConnected) {
    await producer.connect();
  }
  
  try {
    const topic = `updates-${key}`;
    await producer.send({
      topic,
      messages: [
        { 
          value: JSON.stringify({
            key,
            value,
            timestamp: Date.now()
          })
        }
      ]
    });
    
    console.log(`Published update for key ${key} to Kafka`);
    return true;
  } catch (error) {
    console.error('Failed to publish update to Kafka:', error);
    throw error;
  }
}

// Export module
module.exports = {
  connect,
  producer,
  publishUpdate
};