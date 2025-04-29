// measure-old-latency.js
const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const NUM_TESTS = 20;
const TEST_KEY = 'latency-test-key';
const RESULTS_FILE = 'old-latency-results.json';

async function measureLatency() {
  console.log('Đo độ trễ long polling...');
  
  const latencies = [];
  
  for (let i = 1; i <= NUM_TESTS; i++) {
    const value = `test-value-${i}-${Date.now()}`;
    
    // Gửi cập nhật
    const startTime = Date.now();
    await axios.post(`${BASE_URL}/add`, { key: TEST_KEY, value });
    
    // Đợi 2 giây (chu kỳ long polling)
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Đọc giá trị
    const response = await axios.get(`${BASE_URL}/get/${TEST_KEY}`);
    const endTime = Date.now();
    
    // Kiểm tra xem giá trị đã được cập nhật chưa
    if (response.data === value) {
      const latency = endTime - startTime;
      latencies.push(latency);
      console.log(`Test #${i}: Độ trễ = ${latency}ms`);
    } else {
      console.log(`Test #${i}: Giá trị chưa được cập nhật`);
    }
    
    // Đợi một chút giữa các lần kiểm thử
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Tính toán kết quả
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;
  latencies.sort((a, b) => a - b);
  const median = latencies[Math.floor(latencies.length / 2)];
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  
  const results = {
    totalTests: latencies.length,
    averageLatency: avg,
    medianLatency: median,
    minLatency: min,
    maxLatency: max,
    p95Latency: p95
  };
  
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  
  console.log('\n===== KẾT QUẢ ĐO ĐỘ TRỄ LONG POLLING =====');
  console.log(`Số lượng test: ${results.totalTests}`);
  console.log(`Độ trễ trung bình: ${results.averageLatency.toFixed(2)}ms`);
  console.log(`Độ trễ trung vị: ${results.medianLatency}ms`);
  console.log(`Độ trễ nhỏ nhất: ${results.minLatency}ms`);
  console.log(`Độ trễ lớn nhất: ${results.maxLatency}ms`);
  console.log(`Độ trễ P95: ${results.p95Latency}ms`);
}

measureLatency();