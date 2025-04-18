const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'ktpm-producer',
  brokers: ['localhost:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const producer = kafka.producer();

// Publish update cho một key
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

module.exports = {
  producer,
  publishUpdate
};