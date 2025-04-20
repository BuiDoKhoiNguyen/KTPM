let io;

function init(socketio) {
  io = socketio;
  
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