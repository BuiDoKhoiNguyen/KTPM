const { createAdapter } = require('@socket.io/redis-adapter');
const { publisherClient, subscriberClient, pubSubUtils } = require('../config/redis');
const { readData } = require('./dataService');

let io;

const subscribedCategories = new Set();

function init(socketio) {
  io = socketio;
  
  io.adapter(createAdapter(publisherClient, subscriberClient));
  
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('subscribe', async (keyId) => {
      console.log(`Client ${socket.id} subscribed to ${keyId}`);
      
      try {
        const keyData = await readData(keyId);
        
        if (keyData) {
          const category = keyData.category || 'default';

          socket.join(keyId);
          
          socket.emit('subscribed', { 
            status: 'success', 
            key: keyId, 
            category: category 
          });
          
          if (!subscribedCategories.has(category)) {
            await subscribeToCategory(category);
          }
        } else {
          socket.emit('subscribed', { 
            status: 'key-not-found', 
            key: keyId 
          });
          
          socket.join(keyId);
        }
      } catch (error) {
        console.error(`Error when client subscribed to ${keyId}:`, error);
        socket.emit('subscribed', { 
          status: 'error', 
          key: keyId, 
          message: 'Server error when subscribing to key' 
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  return io;
}

async function subscribeToCategory(category) {
  if (subscribedCategories.has(category)) {
    return true; 
  }
  
  try {
    const channelName = `data-updates:${category}`;
    console.log(`Server subscribing to Redis channel: ${channelName}`);
    
    pubSubUtils.subscribe(channelName, (message) => {
      try {
        if (message && message.key) {
          emitUpdate(message.key, message.value, message.category);
        }
      } catch (error) {
        console.error(`Error processing message on channel ${channelName}:`, error.message);
      }
    });
    
    subscribedCategories.add(category);
    console.log(`Successfully subscribed to category: ${category}`);
    
    return true;
  } catch (error) {
    console.error(`Error subscribing to category ${category}:`, error.message);
    return false;
  }
}

function emitUpdate(keyId, value, category) {
  if (!io) throw new Error('Socket.IO not initialized');
  
  const updateData = {
    key: keyId,
    value,
    timestamp: Date.now()
  };

  if (category) {
    updateData.category = category;
  }
  
  io.to(keyId).emit('valueUpdate', updateData);
  
  return true;
}

module.exports = {
  init,
  emitUpdate,
  subscribeToCategory
};