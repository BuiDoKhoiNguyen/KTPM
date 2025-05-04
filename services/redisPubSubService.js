const { pubSubUtils } = require('../config/redis');
const socketService = require('./socketService');

const DEFAULT_CHANNEL = 'data-updates';
const channelName = process.env.REDIS_CHANNEL || DEFAULT_CHANNEL;

let isSubscribed = false;

async function ensureSubscription() {
  if (isSubscribed) return true;
  
  try {
    pubSubUtils.subscribe(channelName, (message) => {
      try {
        if (message && message.key) {
          // Emit qua socket
          socketService.emitUpdate(message.key, message.value);
        }
      } catch (error) {
        console.error('Error processing message:', error.message);
      }
    });
    
    isSubscribed = true;
    return true;
  } catch (error) {
    console.error('Subscription error:', error.message);
    return false;
  }
}

async function publishUpdate(key, value) {
  try {
    const message = {
      key,
      value,
      timestamp: Date.now()
    };
    
    pubSubUtils.publish(channelName, message)
      .catch(error => console.warn('Publish error:', error.message));
      
    return true; 
  } catch (error) {
    console.warn('Failed to prepare message:', error.message);
    return false;
  }
}


function shutdown() {
  if (isSubscribed) {
    pubSubUtils.unsubscribe(channelName);
    isSubscribed = false;
  }
  return true;
}

module.exports = {
  ensureSubscription,
  publishUpdate,
  shutdown
};