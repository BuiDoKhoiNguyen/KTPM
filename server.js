// Imports
require('dotenv').config(); // Thêm để sử dụng biến môi trường từ file .env
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const socketIO = require('socket.io')
const apiRoutes = require('./routes/api');
const { initializeDatabase } = require('./config/database');
const { redisClient } = require('./config/redis');
const socketService = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

async function startServer() {
  try {
    initializeDatabase();
  
    socketService.init(io);
    
    await socketService.subscribeToCategory('default').catch(err => {
      console.error('Failed to subscribe to Redis channel for default category:', err.message);
    });
    
    app.use('/', apiRoutes);

    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('Can not start server ', error);
    process.exit(1);
  }
}

redisClient.on('ready', () => {
  console.log('Redis cache is ready, starting server...');
  startServer();
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  console.log('Starting server without Redis cache...');
  startServer();
});