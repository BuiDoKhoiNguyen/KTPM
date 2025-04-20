// Imports
require('dotenv').config(); // Thêm để sử dụng biến môi trường từ file .env
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const socketio = require('socket.io')

// Import configs & services
const db = require('./config/database');
const apiRoutes = require('./routes/api');
const kafkaService = require('./services/kafkaService');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initializeDatabase } = require('./db/init');
const { redis } = require('./config/redis');
const socketService = require('./services/socketService');

// App setup
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

async function startServer() {
  try {
    await db.authenticate();
    console.log('Database connected');

    await initializeDatabase();
    
    socketService.init(io);

    await kafkaService.connect().catch(err => {
      console.error('Failed to connect to Kafka:', err);
      console.error('Continuing without Kafka...');
    });

    // Routes
    app.use('/', apiRoutes);
    
    app.use(notFoundHandler);
    app.use(errorHandler);

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

redis.on('ready', () => {
  console.log('Redis cache is ready, starting server...');
  startServer();
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  console.log('Starting server without Redis cache...');
  startServer();
});