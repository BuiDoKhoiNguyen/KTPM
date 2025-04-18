// Imports
require('dotenv').config(); // Thêm để sử dụng biến môi trường từ file .env
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const socketio = require('socket.io');

// Import configs & services
const db = require('./config/database');
const socketService = require('./services/socketService');
const apiRoutes = require('./routes/api');
const { connectKafka } = require('./services/pubsub');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initializeDatabase } = require('./db/init');
const { initializeModels } = require('./models');

// App setup
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Khởi động server chỉ sau khi đã khởi tạo database thành công
async function startServer() {
  try {
    // Kết nối database
    await db.authenticate();
    console.log('Database connected');

    // Khởi tạo database và các bảng
    await initializeDatabase();
    
    // Initialize Socket.IO
    socketService.init(io);

    // Initialize Kafka
    await connectKafka().catch(err => {
      console.error('Failed to connect to Kafka:', err);
      // Không exit process, chỉ log lỗi
      console.error('Continuing without Kafka...');
    });

    // Routes
    app.use('/', apiRoutes);
    
    // Error handling middleware (đặt sau routes)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Không thể khởi động server:', error);
    process.exit(1);
  }
}

// Khởi động server
startServer();