const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Cấu hình benchmark
const CONFIG = {
  baseUrl: 'http://localhost:8888', // KTPM-base
  optimizedUrl: 'http://localhost:8080', // KTPM-btl
  concurrentRequests: 200, // Số lượng request đồng thời
  iterations: 5, // Số lần chạy để lấy trung bình
  testKeys: ['test1', 'test2', 'test3', 'test4', 'test5'],
  testValues: ['value1', 'value2', 'value3', 'value4', 'value5'],
  resultFile: path.join(__dirname, 'public/benchmark-results.json'),
  warmupRequests: 20, // Số request cho mỗi key để warmup cache
};

// Biến lưu trữ kết quả
const results = {
  timestamp: new Date().toISOString(),
  getRequests: {
    base: { times: [], avgTime: 0, minTime: 0, maxTime: 0, successRate: 0, rps: 0 },
    optimized: { times: [], avgTime: 0, minTime: 0, maxTime: 0, successRate: 0, rps: 0 }
  },
  addRequests: {
    base: { times: [], avgTime: 0, minTime: 0, maxTime: 0, successRate: 0, rps: 0 },
    optimized: { times: [], avgTime: 0, minTime: 0, maxTime: 0, successRate: 0, rps: 0 }
  },
  cachingPerformance: {
    firstRequestTime: 0,
    subsequentAvgTime: 0,
    improvement: 0
  },
  comparison: {
    getSpeedImprovement: 0,
    addSpeedImprovement: 0,
    getThroughputImprovement: 0,
    addThroughputImprovement: 0
  }
};

/**
 * Tạo mảng các promise để gửi request đồng thời
 */
function createRequests(url, method, count, key = null, value = null) {
  const requests = [];
  
  for (let i = 0; i < count; i++) {
    if (method === 'GET') {
      // Phân phối key ngẫu nhiên để có một số cache hits và một số cache misses
      const testKey = key || CONFIG.testKeys[i % CONFIG.testKeys.length];
      requests.push(axios.get(`${url}/get/${testKey}`).catch(err => ({ error: err.message })));
    } else {
      // Request POST với payload
      const testKey = key || `benchmark_key_${Date.now()}_${i}`;
      const testValue = value || CONFIG.testValues[i % CONFIG.testValues.length];
      requests.push(axios.post(`${url}/add`, { key: testKey, value: testValue })
        .catch(err => ({ error: err.message })));
    }
  }
  
  return requests;
}

/**
 * Chạy một vòng benchmark
 */
async function runBenchmark(url, method, count, key = null, value = null) {
  console.log(`Chạy ${method} benchmark trên ${url} với ${count} requests...`);
  
  const startTime = process.hrtime();
  
  // Tạo các requests đồng thời
  const requests = createRequests(url, method, count, key, value);
  
  // Thực thi các requests và đợi kết quả
  const responses = await Promise.all(requests);
  
  // Đo thời gian thực thi
  const diffTime = process.hrtime(startTime);
  const timeInMs = (diffTime[0] * 1000) + (diffTime[1] / 1000000);
  
  // Tính tỷ lệ thành công
  const successfulRequests = responses.filter(res => !res.error).length;
  const successRate = (successfulRequests / count) * 100;
  
  // Tính toán reqs/sec
  const rps = Math.floor((count / timeInMs) * 1000);
  
  return {
    totalTime: timeInMs,
    successRate,
    rps
  };
}

/**
 * Thực hiện benchmark cho một API cụ thể trên cả hai hệ thống
 */
async function benchmarkEndpoint(method, key = null, value = null) {
  console.log(`\n========== Benchmark ${method} API ==========`);
  
  // Benchmark hệ thống cơ sở
  console.log(`\nThực hiện benchmark ${method} API trên hệ thống cơ sở (${CONFIG.baseUrl})...`);
  const baseResults = [];
  for (let i = 0; i < CONFIG.iterations; i++) {
    console.log(`Lần chạy ${i + 1}/${CONFIG.iterations}...`);
    const result = await runBenchmark(CONFIG.baseUrl, method, CONFIG.concurrentRequests, key, value);
    baseResults.push(result);
  }
  
  // Benchmark hệ thống tối ưu
  console.log(`\nThực hiện benchmark ${method} API trên hệ thống tối ưu (${CONFIG.optimizedUrl})...`);
  const optimizedResults = [];
  for (let i = 0; i < CONFIG.iterations; i++) {
    console.log(`Lần chạy ${i + 1}/${CONFIG.iterations}...`);
    const result = await runBenchmark(CONFIG.optimizedUrl, method, CONFIG.concurrentRequests, key, value);
    optimizedResults.push(result);
  }
  
  // Tính toán giá trị trung bình
  const baseAvg = {
    avgTime: baseResults.reduce((sum, r) => sum + r.totalTime, 0) / CONFIG.iterations,
    minTime: Math.min(...baseResults.map(r => r.totalTime)),
    maxTime: Math.max(...baseResults.map(r => r.totalTime)),
    successRate: baseResults.reduce((sum, r) => sum + r.successRate, 0) / CONFIG.iterations,
    rps: Math.floor(baseResults.reduce((sum, r) => sum + r.rps, 0) / CONFIG.iterations)
  };
  
  const optimizedAvg = {
    avgTime: optimizedResults.reduce((sum, r) => sum + r.totalTime, 0) / CONFIG.iterations,
    minTime: Math.min(...optimizedResults.map(r => r.totalTime)),
    maxTime: Math.max(...optimizedResults.map(r => r.totalTime)),
    successRate: optimizedResults.reduce((sum, r) => sum + r.successRate, 0) / CONFIG.iterations,
    rps: Math.floor(optimizedResults.reduce((sum, r) => sum + r.rps, 0) / CONFIG.iterations)
  };
  
  // Tính phần trăm cải thiện
  const timeImprovement = ((baseAvg.avgTime - optimizedAvg.avgTime) / baseAvg.avgTime) * 100;
  const rpsImprovement = ((optimizedAvg.rps - baseAvg.rps) / baseAvg.rps) * 100;
  
  // Lưu kết quả
  if (method === 'GET') {
    results.getRequests.base = {
      times: baseResults.map(r => r.totalTime),
      ...baseAvg
    };
    results.getRequests.optimized = {
      times: optimizedResults.map(r => r.totalTime),
      ...optimizedAvg
    };
    results.comparison.getSpeedImprovement = timeImprovement;
    results.comparison.getThroughputImprovement = rpsImprovement;
  } else {
    results.addRequests.base = {
      times: baseResults.map(r => r.totalTime),
      ...baseAvg
    };
    results.addRequests.optimized = {
      times: optimizedResults.map(r => r.totalTime),
      ...optimizedAvg
    };
    results.comparison.addSpeedImprovement = timeImprovement;
    results.comparison.addThroughputImprovement = rpsImprovement;
  }
  
  console.log('\n--- Kết quả:');
  console.log(`KTPM-base: ${baseAvg.avgTime.toFixed(2)}ms, ${baseAvg.rps} reqs/sec, ${baseAvg.successRate.toFixed(2)}% success`);
  console.log(`KTPM-btl: ${optimizedAvg.avgTime.toFixed(2)}ms, ${optimizedAvg.rps} reqs/sec, ${optimizedAvg.successRate.toFixed(2)}% success`);
  console.log(`Cải thiện thời gian: ${timeImprovement.toFixed(2)}%`);
  console.log(`Cải thiện throughput: ${rpsImprovement.toFixed(2)}%`);
  
  return { base: baseAvg, optimized: optimizedAvg, improvement: timeImprovement };
}

/**
 * Kiểm tra hiệu năng cache bằng cách thực hiện nhiều yêu cầu lặp lại 
 * tới cùng một key trên hệ thống tối ưu
 */
async function testCachingPerformance() {
  console.log('\n========== Kiểm tra hiệu năng cache ==========');
  
  const testKey = `cache_test_${Date.now()}`;
  const testValue = `Cache test value ${Date.now()}`;
  
  // Đầu tiên thêm key
  await axios.post(`${CONFIG.optimizedUrl}/add`, { key: testKey, value: testValue });
  
  console.log('Đo thời gian yêu cầu đầu tiên (cold cache)...');
  const firstRequest = await runBenchmark(CONFIG.optimizedUrl, 'GET', 1, testKey);
  
  console.log('Đo thời gian các yêu cầu tiếp theo (warm cache)...');
  const cachedResults = [];
  for (let i = 0; i < 5; i++) {
    const result = await runBenchmark(CONFIG.optimizedUrl, 'GET', 10, testKey);
    cachedResults.push(result);
  }
  
  const avgCachedTime = cachedResults.reduce((sum, r) => sum + r.totalTime, 0) / cachedResults.length / 10;
  const cacheImprovement = ((firstRequest.totalTime - avgCachedTime) / firstRequest.totalTime) * 100;
  
  results.cachingPerformance = {
    firstRequestTime: firstRequest.totalTime,
    subsequentAvgTime: avgCachedTime,
    improvement: cacheImprovement
  };
  
  console.log('\n--- Kết quả Cache:');
  console.log(`Yêu cầu đầu tiên (cold): ${firstRequest.totalTime.toFixed(2)}ms`);
  console.log(`Yêu cầu tiếp theo (cached, trung bình): ${avgCachedTime.toFixed(2)}ms`);
  console.log(`Cải thiện: ${cacheImprovement.toFixed(2)}%`);
}

/**
 * Hàm dùng để làm nóng cache trước khi chạy benchmark chính
 * Điều này đảm bảo API GET được test trong điều kiện cache đã hoạt động
 */
async function warmupCache(url) {
  console.log(`\nĐang làm nóng cache cho ${url}...`);
  
  const warmupPromises = [];
  
  // Thực hiện nhiều request GET cho mỗi key để đảm bảo cache được làm nóng
  for (const key of CONFIG.testKeys) {
    for (let i = 0; i < CONFIG.warmupRequests; i++) {
      warmupPromises.push(
        axios.get(`${url}/get/${key}`)
          .catch(err => console.log(`Warmup request cho key ${key} thất bại: ${err.message}`))
      );
    }
  }
  
  await Promise.all(warmupPromises);
  console.log('Hoàn thành việc làm nóng cache.\n');
}

/**
 * Hàm chính thực hiện benchmark
 */
async function main() {
  console.log('==================================================');
  console.log('    KTPM BENCHMARK - SO SÁNH HIỆU NĂNG HỆ THỐNG   ');
  console.log('==================================================\n');
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Optimized URL: ${CONFIG.optimizedUrl}`);
  console.log(`Concurrent Requests: ${CONFIG.concurrentRequests}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log('--------------------------------------------------\n');
  
  try {
    // Chuẩn bị dữ liệu thử nghiệm
    console.log('Chuẩn bị dữ liệu thử nghiệm...');
    for (const key of CONFIG.testKeys) {
      const value = `Test value for ${key} at ${Date.now()}`;
      try {
        await axios.post(`${CONFIG.baseUrl}/add`, { key, value });
        await axios.post(`${CONFIG.optimizedUrl}/add`, { key, value });
      } catch (err) {
        console.error(`Không thể tạo dữ liệu thử nghiệm cho key ${key}:`, err.message);
      }
    }
    
    // Thực hiện warmup cache cho hệ thống tối ưu trước khi benchmark
    await warmupCache(CONFIG.optimizedUrl);
    
    // Benchmark các API GET
    await benchmarkEndpoint('GET');
    
    // Benchmark các API POST
    await benchmarkEndpoint('POST');
    
    // Kiểm tra hiệu năng cache
    await testCachingPerformance();
    
    // In kết quả tổng quan
    console.log('\n\n==================================================');
    console.log('              KẾT QUẢ TỔNG QUAN                   ');
    console.log('==================================================');
    
    console.log('\n--- API GET:');
    console.log(`KTPM-base: ${results.getRequests.base.avgTime.toFixed(2)}ms, ${results.getRequests.base.rps} reqs/sec`);
    console.log(`KTPM-btl: ${results.getRequests.optimized.avgTime.toFixed(2)}ms, ${results.getRequests.optimized.rps} reqs/sec`);
    console.log(`Cải thiện thời gian: ${results.comparison.getSpeedImprovement.toFixed(2)}%`);
    console.log(`Cải thiện throughput: ${results.comparison.getThroughputImprovement.toFixed(2)}%`);
    
    console.log('\n--- API ADD:');
    console.log(`KTPM-base: ${results.addRequests.base.avgTime.toFixed(2)}ms, ${results.addRequests.base.rps} reqs/sec`);
    console.log(`KTPM-btl: ${results.addRequests.optimized.avgTime.toFixed(2)}ms, ${results.addRequests.optimized.rps} reqs/sec`);
    console.log(`Cải thiện thời gian: ${results.comparison.addSpeedImprovement.toFixed(2)}%`);
    console.log(`Cải thiện throughput: ${results.comparison.addThroughputImprovement.toFixed(2)}%`);
    
    console.log('\n--- Hiệu năng Cache:');
    console.log(`Yêu cầu đầu tiên: ${results.cachingPerformance.firstRequestTime.toFixed(2)}ms`);
    console.log(`Yêu cầu tiếp theo (trung bình): ${results.cachingPerformance.subsequentAvgTime.toFixed(2)}ms`);
    console.log(`Cải thiện cache: ${results.cachingPerformance.improvement.toFixed(2)}%`);
    
    // Lưu kết quả vào file
    fs.writeFileSync(CONFIG.resultFile, JSON.stringify(results, null, 2));
    console.log(`\nĐã lưu kết quả chi tiết vào ${CONFIG.resultFile}`);
    
  } catch (error) {
    console.error('Lỗi trong quá trình benchmark:', error);
  }
}

// Chạy benchmark khi script được thực thi trực tiếp
if (require.main === module) {
  main().catch(err => console.error('Lỗi không xử lý được:', err));
}

module.exports = { runBenchmark, benchmarkEndpoint };