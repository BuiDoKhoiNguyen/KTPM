const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
let io;

function init(socketio) {
  io = socketio;
  
  // Thiết lập Redis adapter cho Socket.IO
  const pubClient = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  });
  
  const subClient = pubClient.duplicate();
  
  // Đăng ký Redis adapter
  io.adapter(createAdapter(pubClient, subClient));
  
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

// Emit data update for all clients subscribing to the keyId
function emitUpdate(keyId, value) {
  if (!io) throw new Error('Socket.IO not initialized');
  
  console.log(`Emitting update for key ${keyId} with value ${value}`);
  
  io.to(keyId).emit('valueUpdate', {
    key: keyId,
    value,
    timestamp: Date.now()
  });
  
  return true;
}

function broadcastUpdate(data) {
  if (!io) throw new Error('Socket.IO not initialized');
  
  io.emit('update', {
    data,
    timestamp: Date.now()
  });

  if (data.key && data.value !== undefined) {
    emitUpdate(data.key, data.value);
  }
  
  return true;
}

module.exports = {
  init,
  emitUpdate,  
  broadcastUpdate
};