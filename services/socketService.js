const { createAdapter } = require('@socket.io/redis-adapter');
const { publisherClient, subscriberClient } = require('../config/redis');
let io;

function init(socketio) {
  io = socketio;
  
  io.adapter(createAdapter(publisherClient, subscriberClient));
  
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('subscribe', (keyId) => {
      console.log(`Client ${socket.id} subscribed to ${keyId}`);
      socket.join(keyId);
      socket.emit('subscribed', { status: 'success', key: keyId });
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  return io;
}

function emitUpdate(keyId, value) {
  if (!io) throw new Error('Socket.IO not initialized');
  
  io.to(keyId).emit('valueUpdate', {
    key: keyId,
    value,
    timestamp: Date.now()
  });
  
  return true;
}

module.exports = {
  init,
  emitUpdate
};