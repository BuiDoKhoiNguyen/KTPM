// scripts/generate-test-data.js
const axios = require('axios');

// Cấu hình
const BASE_URL = 'http://localhost:8080';
const NUM_KEYS = 100;

async function generateTestData() {
  console.log('Bắt đầu tạo dữ liệu mẫu...');
  
  for (let i = 1; i <= NUM_KEYS; i++) {
    const key = `test-key-${i}`;
    const value = `test-value-${i}-${Date.now()}`;
    
    try {
      const response = await axios.post(`${BASE_URL}/add`, { key, value });
      if (response.data.success) {
        console.log(`✅ Đã tạo key: ${key}`);
      } else {
        console.error(`❌ Lỗi khi tạo key: ${key}`);
      }
    } catch (error) {
      console.error(`❌ Lỗi khi tạo key ${key}:`, error.message);
    }
    
    // Đợi một chút để tránh quá tải server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Hoàn thành tạo dữ liệu mẫu!');
}

generateTestData();
