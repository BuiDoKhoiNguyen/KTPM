// tests/performance/socket-latency-test.js
const axios = require('axios');
const io = require('socket.io-client');
const fs = require('fs');

// Cấu hình
const BASE_URL = 'http://localhost:8080';
const NUM_TESTS = 100;
const TEST_KEY = 'socket-test-key';
const RESULTS_FILE = 'socket-latency-results.json';

async function runSocketLatencyTest() {
  console.log('Bắt đầu đo độ trễ Socket.IO...');
  
  // Kết nối Socket.IO
  const socket = io(BASE_URL);
  const latencies = [];
  let testCount = 0;
  
  // Đợi kết nối thành công
  await new Promise(resolve => {
    socket.on('connect', () => {
      console.log('Đã kết nối Socket.IO');
      resolve();
    });
  });
  
  // Đăng ký nhận cập nhật cho test key
  socket.emit('subscribe', TEST_KEY);
  
  // Lắng nghe cập nhật
  socket.on('valueUpdate', (data) => {
    if (data.key === TEST_KEY) {
      const receivedTime = Date.now();
      const sentTime = parseInt(data.value.split('-').pop());
      const latency = receivedTime - sentTime;
      
      latencies.push(latency);
      console.log(`Test #${testCount}: Độ trễ = ${latency}ms`);
      
      testCount++;
      if (testCount >= NUM_TESTS) {
        // Hoàn thành kiểm thử
        finishTest(latencies);
      }
    }
  });
  
  // Thực hiện các lần cập nhật
  for (let i = 1; i <= NUM_TESTS; i++) {
    const value = `socket-test-value-${i}-${Date.now()}`;
    
    try {
      await axios.post(`${BASE_URL}/add`, { key: TEST_KEY, value });
      // Đợi một chút giữa các lần cập nhật
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Lỗi khi cập nhật key ${TEST_KEY}:`, error.message);
    }
  }
  
  function finishTest(latencies) {
    // Tính toán các chỉ số
    const sum = latencies.reduce((a, b) => a + b, 0);
    const avg = sum / latencies.length;
    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)];
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    
    const results = {
      totalTests: latencies.length,
      averageLatency: avg,
      medianLatency: median,
      minLatency: min,
      maxLatency: max,
      p95Latency: p95,
      p99Latency: p99,
      allLatencies: latencies
    };
    
    // Lưu kết quả
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    
    console.log('\n===== KẾT QUẢ ĐO ĐỘ TRỄ SOCKET.IO =====');
    console.log(`Số lượng test: ${results.totalTests}`);
    console.log(`Độ trễ trung bình: ${results.averageLatency.toFixed(2)}ms`);
    console.log(`Độ trễ trung vị: ${results.medianLatency}ms`);
    console.log(`Độ trễ nhỏ nhất: ${results.minLatency}ms`);
    console.log(`Độ trễ lớn nhất: ${results.maxLatency}ms`);
    console.log(`Độ trễ P95: ${results.p95Latency}ms`);
    console.log(`Độ trễ P99: ${results.p99Latency}ms`);
    console.log('Kết quả chi tiết đã được lưu vào file:', RESULTS_FILE);
    
    // Đóng kết nối
    socket.disconnect();
    process.exit(0);
  }
}

runSocketLatencyTest();
