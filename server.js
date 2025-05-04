// Imports
require('dotenv').config(); // Thêm để sử dụng biến môi trường từ file .env
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const socketIO = require('socket.io')
const apiRoutes = require('./routes/api');
const { initializeDatabase } = require('./config/database');
const { redisClient, pubSubUtils } = require('./config/redis');
const socketService = require('./services/socketService');

// App setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const channelName = process.env.REDIS_CHANNEL || 'data-updates';
let isSubscribed = false;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureRedisSubscription() {
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

async function startServer() {
  try {
    initializeDatabase();
  
    socketService.init(io);
    
    await ensureRedisSubscription().catch(err => {
      console.error('Failed to subscribe to Redis channel:', err.message);
    });

    // Routes
    app.use('/', apiRoutes);

    // Start server
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('Can not start server ', error);
    process.exit(1);
  }
}

// Start server when Redis is ready
redisClient.on('ready', () => {
  console.log('Redis cache is ready, starting server...');
  startServer();
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  console.log('Starting server without Redis cache...');
  startServer();
});