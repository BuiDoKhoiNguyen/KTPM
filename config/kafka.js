const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'ktpm-admin',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']
});

const admin = kafka.admin();

async function createTestTopic() {
  try {
    await admin.connect();
    console.log('Admin connected');
    
    const topicName = process.env.KAFKA_TOPIC || 'updates-test';
    
    // Tạo test topic
    await admin.createTopics({
      topics: [
        { topic: topicName }
      ],
    });
    
    console.log(`Topic "${topicName}" created successfully`);
    
    // Liệt kê tất cả các topics
    const topics = await admin.listTopics();
    console.log('Available topics:', topics);
    
    await admin.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Chỉ chạy khi cần tạo topic mới
// createTestTopic();

module.exports = {
  kafka,
  createTestTopic
};