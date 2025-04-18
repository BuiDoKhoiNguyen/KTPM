let io;

// Khởi tạo Socket.IO
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

// Emit data update cho tất cả clients đang subscribe vào keyId
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