let io;

function init(socketio) {
  io = socketio;
  
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Client subscribes to updates cho một key cụ thể
    socket.on('subscribe', (keyId) => {
      console.log(`Client ${socket.id} subscribed to ${keyId}`);
      socket.join(keyId);
      
      // Gửi xác nhận subscription
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

function broadcastUpdate(data) {
  if (!io) throw new Error('Socket.IO not initialized');
  
  // Phát sóng đến tất cả các clients
  io.emit('update', {
    data,
    timestamp: Date.now()
  });
  
  // Nếu data có key, cũng phát đến room cụ thể
  if (data.key) {
    emitUpdate(data.key, data.value);
  }
  
  return true;
}

module.exports = {
  init,
  emitUpdate,
  broadcastUpdate
};