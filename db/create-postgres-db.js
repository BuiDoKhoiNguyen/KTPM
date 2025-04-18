/**
 * Script để tạo database PostgreSQL
 */
require('dotenv').config();
const { Client } = require('pg');

async function createDatabase() {
  // Kết nối đến PostgreSQL server với database mặc định "postgres"
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // Database mặc định để kết nối
  });

  try {
    // Kết nối đến server
    await client.connect();
    console.log('Đã kết nối đến PostgreSQL server');
    
    const dbName = process.env.DB_NAME || 'ktpm_db';
    
    // Kiểm tra xem database đã tồn tại chưa
    const checkResult = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [dbName]);
    
    // Nếu database chưa tồn tại, tạo mới
    if (checkResult.rows.length === 0) {
      // Tạo database mới
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" đã được tạo thành công!`);
    } else {
      console.log(`Database "${dbName}" đã tồn tại.`);
    }
    
    console.log('Bạn có thể tiếp tục khởi tạo database với lệnh: npm run init-db');
    
  } catch (error) {
    console.error('Lỗi khi tạo database:', error);
    throw error;
  } finally {
    // Đóng kết nối
    await client.end();
    console.log('Đã đóng kết nối đến PostgreSQL server');
  }
}

// Nếu chạy trực tiếp
if (require.main === module) {
  createDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Lỗi nghiêm trọng:', err);
      process.exit(1);
    });
}

module.exports = { createDatabase };