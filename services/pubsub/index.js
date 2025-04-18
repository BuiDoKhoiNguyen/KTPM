const { Kafka } = require('kafkajs');
const socketService = require('../socketService');

// Kafka setup
const kafka = new Kafka({
  clientId: 'ktpm-app',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

// Producer-Consumer setup
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'ktpm-consumer-group' });

// Connect Kafka
async function connectKafka() {
  await producer.connect();
  await consumer.connect();
  console.log('Kafka connected');
  
  const topicName = process.env.KAFKA_TOPIC || 'data-events';
  
  // Subscribe to topics
  await consumer.subscribe({ 
    topic: topicName, 
    fromBeginning: true 
  });
  
  // Run consumer
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        console.log(`Received message: ${message.value.toString()}`);
        
        // Broadcast to all connected clients via Socket.io
        socketService.broadcastUpdate(data);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  });
}

module.exports = {
  kafka,
  producer,
  consumer,
  connectKafka
};