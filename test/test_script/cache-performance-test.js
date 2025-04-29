// tests/performance/cache-performance-test.js
const axios = require('axios');
const fs = require('fs');

// Cấu hình
const BASE_URL = 'http://localhost:8080';
const NUM_TESTS = 100;
const TEST_KEY = 'cache-test-key';
const RESULTS_FILE = 'cache-performance-results.json';

async function runCachePerformanceTest() {
  console.log('Bắt đầu đo hiệu năng cache...');
  
  // Tạo key test
  try {
    await axios.post(`${BASE_URL}/add`, { 
      key: TEST_KEY, 
      value: `cache-test-value-${Date.now()}` 
    });
    console.log(`Đã tạo key test: ${TEST_KEY}`);
  } catch (error) {
    console.error('Lỗi khi tạo key test:', error.message);
    return;
  }
  
  // Đo thời gian truy vấn lần đầu (cache miss)
  console.log('\nĐo thời gian truy vấn lần đầu (cache miss)...');
  const cacheMissResults = [];
  
  for (let i = 1; i <= NUM_TESTS; i++) {
    // Xóa cache bằng cách tạo key mới
    await axios.post(`${BASE_URL}/add`, { 
      key: `${TEST_KEY}-${i}`, 
      value: `cache-test-value-${i}-${Date.now()}` 
    });
    
    // Đo thời gian truy vấn
    const startTime = Date.now();
    await axios.get(`${BASE_URL}/get/${TEST_KEY}-${i}`);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    cacheMissResults.push(duration);
    if (i % 10 === 0) {
      console.log(`Hoàn thành ${i}/${NUM_TESTS} tests (cache miss)`);
    }
  }
  
  // Đo thời gian truy vấn lần thứ hai (cache hit)
  console.log('\nĐo thời gian truy vấn lần thứ hai (cache hit)...');
  const cacheHitResults = [];
  
  for (let i = 1; i <= NUM_TESTS; i++) {
    // Đo thời gian truy vấn
    const startTime = Date.now();
    await axios.get(`${BASE_URL}/get/${TEST_KEY}-${i}`);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    cacheHitResults.push(duration);
    if (i % 10 === 0) {
      console.log(`Hoàn thành ${i}/${NUM_TESTS} tests (cache hit)`);
    }
  }
  
  // Tính toán kết quả
  const calculateStats = (data) => {
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    return {
      average: avg,
      median: median,
      min: min,
      max: max,
      p95: p95
    };
  };
  
  const cacheMissStats = calculateStats(cacheMissResults);
  const cacheHitStats = calculateStats(cacheHitResults);
  
  // Tính toán cải thiện
  const improvement = {
    average: ((cacheMissStats.average - cacheHitStats.average) / cacheMissStats.average * 100).toFixed(2),
    median: ((cacheMissStats.median - cacheHitStats.median) / cacheMissStats.median * 100).toFixed(2),
    p95: ((cacheMissStats.p95 - cacheHitStats.p95) / cacheMissStats.p95 * 100).toFixed(2)
  };
  
  // Lưu kết quả
  const results = {
    cacheMiss: {
      stats: cacheMissStats,
      allResults: cacheMissResults
    },
    cacheHit: {
      stats: cacheHitStats,
      allResults: cacheHitResults
    },
    improvement: improvement
  };
  
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  
  // In kết quả
  console.log('\n===== KẾT QUẢ ĐO HIỆU NĂNG CACHE =====');
  console.log('Cache Miss (Database):');
  console.log(`  Thời gian trung bình: ${cacheMissStats.average.toFixed(2)}ms`);
  console.log(`  Thời gian trung vị: ${cacheMissStats.median}ms`);
  console.log(`  Thời gian nhỏ nhất: ${cacheMissStats.min}ms`);
  console.log(`  Thời gian lớn nhất: ${cacheMissStats.max}ms`);
  console.log(`  Thời gian P95: ${cacheMissStats.p95}ms`);
  
  console.log('\nCache Hit (Redis):');
  console.log(`  Thời gian trung bình: ${cacheHitStats.average.toFixed(2)}ms`);
  console.log(`  Thời gian trung vị: ${cacheHitStats.median}ms`);
  console.log(`  Thời gian nhỏ nhất: ${cacheHitStats.min}ms`);
  console.log(`  Thời gian lớn nhất: ${cacheHitStats.max}ms`);
  console.log(`  Thời gian P95: ${cacheHitStats.p95}ms`);
  
  console.log('\nCải thiện hiệu năng:');
  console.log(`  Thời gian trung bình: ${improvement.average}%`);
  console.log(`  Thời gian trung vị: ${improvement.median}%`);
  console.log(`  Thời gian P95: ${improvement.p95}%`);
  
  console.log('\nKết quả chi tiết đã được lưu vào file:', RESULTS_FILE);
}

runCachePerformanceTest();
