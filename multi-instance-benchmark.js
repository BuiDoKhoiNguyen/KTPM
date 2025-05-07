const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Multi-instance benchmark configuration
const CONFIG = {
  baseUrl: 'http://localhost:8888', // KTPM-base (single instance)
  optimizedUrl: 'http://localhost:80', // KTPM-btl (multi-instance via Nginx)
  concurrentUsers: 500, // Number of simulated users
  requestsPerUser: 20, // Number of requests each user will make
  rampUpTime: 5000, // Time in ms to ramp up all users
  testDuration: 30000, // Total test duration in ms
  workerCount: Math.max(os.cpus().length - 1, 1), // Use all CPU cores except one
  testKeys: Array.from({ length: 50 }, (_, i) => `multi_test_${i}`),
  testValues: Array.from({ length: 50 }, (_, i) => `multi_value_${i}`),
  resultFile: path.join(__dirname, 'public/multi-instance-benchmark-results.json'),
  endpoints: {
    get: '/get/',
    add: '/add'
  }
};

// Results structure
const results = {
  timestamp: new Date().toISOString(),
  testConfig: { ...CONFIG },
  summary: {
    base: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      minResponseTime: Number.MAX_VALUE,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0
    },
    optimized: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      minResponseTime: Number.MAX_VALUE,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0
    }
  },
  comparison: {
    responseTimeImprovement: 0,
    throughputImprovement: 0,
    errorRateImprovement: 0,
    scalabilityScore: 0
  },
  detailedMetrics: {
    base: {
      responseTimes: [],
      errorsByType: {},
      requestsOverTime: []
    },
    optimized: {
      responseTimes: [],
      errorsByType: {},
      requestsOverTime: []
    }
  }
};

/**
 * Worker thread function to simulate multiple users making requests
 */
function workerFunction() {
  const { 
    baseUrl, optimizedUrl, 
    concurrentUsers, requestsPerUser, 
    rampUpTime, testDuration,
    endpoints, testKeys, testValues, 
    totalWorkers, workerId 
  } = workerData;

  // Calculate users for this worker
  const usersPerWorker = Math.floor(concurrentUsers / totalWorkers);
  const startUserIndex = workerId * usersPerWorker;
  const endUserIndex = (workerId === totalWorkers - 1)
    ? concurrentUsers
    : startUserIndex + usersPerWorker;
  const userCount = endUserIndex - startUserIndex;

  // Metrics storage
  const metrics = {
    base: {
      responseTimes: [],
      errors: 0,
      errorsByType: {},
      requestCounts: []
    },
    optimized: {
      responseTimes: [],
      errors: 0,
      errorsByType: {},
      requestCounts: []
    }
  };

  // Helper to record request metrics
  async function makeRequest(url, method, data = null) {
    const start = process.hrtime();
    try {
      if (method === 'GET') {
        const response = await axios.get(url, { timeout: 5000 });
        const diff = process.hrtime(start);
        return { 
          success: true, 
          time: diff[0] * 1000 + diff[1] / 1000000,
          data: response.data 
        };
      } else {
        const response = await axios.post(url, data, { timeout: 5000 });
        const diff = process.hrtime(start);
        return { 
          success: true, 
          time: diff[0] * 1000 + diff[1] / 1000000,
          data: response.data 
        };
      }
    } catch (error) {
      const diff = process.hrtime(start);
      const errorMessage = error.message || 'Unknown error';
      return { 
        success: false, 
        time: diff[0] * 1000 + diff[1] / 1000000,
        error: errorMessage
      };
    }
  }

  // Simulate a user making requests
  async function simulateUser(userId) {
    const isBaseSystem = userId % 2 === 0; // Alternate between systems
    const baseSystem = isBaseSystem ? 'base' : 'optimized';
    const url = isBaseSystem ? baseUrl : optimizedUrl;
    
    for (let i = 0; i < requestsPerUser; i++) {
      // Mix GET and POST requests (70% GET, 30% POST)
      const isGetRequest = Math.random() < 0.7;
      let result;

      if (isGetRequest) {
        // GET request
        const keyIndex = Math.floor(Math.random() * testKeys.length);
        result = await makeRequest(`${url}${endpoints.get}${testKeys[keyIndex]}`, 'GET');
      } else {
        // POST request
        const keyIndex = Math.floor(Math.random() * testKeys.length);
        const valueIndex = Math.floor(Math.random() * testValues.length);
        const payload = { 
          key: `${testKeys[keyIndex]}_${Date.now()}_${userId}`, 
          value: testValues[valueIndex] 
        };
        result = await makeRequest(`${url}${endpoints.add}`, 'POST', payload);
      }

      // Record metrics
      if (result.success) {
        metrics[baseSystem].responseTimes.push(result.time);
      } else {
        metrics[baseSystem].errors++;
        const errorType = result.error.includes('timeout') ? 'timeout' : 
                          result.error.includes('Network') ? 'network' : 'other';
        metrics[baseSystem].errorsByType[errorType] = 
          (metrics[baseSystem].errorsByType[errorType] || 0) + 1;
      }

      // Add artificial delay between requests (10-100ms) to simulate real users
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 90));
      
      // Stop if the test duration is exceeded
      if (Date.now() > testEndTime) {
        break;
      }
    }
  }

  // Calculate test end time
  const testStartTime = Date.now();
  const testEndTime = testStartTime + testDuration;

  // Record metrics over time (every second)
  const metricsInterval = setInterval(() => {
    const timestamp = Date.now() - testStartTime;
    metrics.base.requestCounts.push({
      timestamp,
      count: metrics.base.responseTimes.length + metrics.base.errors
    });
    metrics.optimized.requestCounts.push({
      timestamp,
      count: metrics.optimized.responseTimes.length + metrics.optimized.errors
    });
  }, 1000);

  // Start users with ramp up
  const userPromises = [];
  const userDelayIncrement = rampUpTime / userCount;

  for (let i = 0; i < userCount; i++) {
    const userId = startUserIndex + i;
    const delay = i * userDelayIncrement;
    
    userPromises.push(
      new Promise(resolve => {
        setTimeout(async () => {
          await simulateUser(userId);
          resolve();
        }, delay);
      })
    );
  }

  // Wait for all users to complete their requests
  Promise.all(userPromises).then(() => {
    clearInterval(metricsInterval);
    parentPort.postMessage(metrics);
  });
}

/**
 * Prepare test data by adding keys to both systems
 */
async function prepareTestData() {
  console.log('Preparing test data...');
  const promises = [];

  for (const key of CONFIG.testKeys) {
    const value = `Multi-instance test value for ${key}`;
    promises.push(
      axios.post(`${CONFIG.baseUrl}${CONFIG.endpoints.add}`, { key, value })
        .catch(err => console.error(`Failed to add key ${key} to base system: ${err.message}`))
    );
    promises.push(
      axios.post(`${CONFIG.optimizedUrl}${CONFIG.endpoints.add}`, { key, value })
        .catch(err => console.error(`Failed to add key ${key} to optimized system: ${err.message}`))
    );
  }

  await Promise.all(promises);
  console.log('Test data preparation complete.');
}

/**
 * Calculate and display test statistics
 */
function calculateStatistics(workerResults) {
  console.log('\n========== Processing test results ==========');
  
  // Combine data from all workers
  let baseResponseTimes = [];
  let optimizedResponseTimes = [];
  let baseErrors = 0;
  let optimizedErrors = 0;
  let baseErrorsByType = {};
  let optimizedErrorsByType = {};
  let baseRequestsOverTime = [];
  let optimizedRequestsOverTime = [];
  
  workerResults.forEach(workerData => {
    // Combine response times
    baseResponseTimes = baseResponseTimes.concat(workerData.base.responseTimes);
    optimizedResponseTimes = optimizedResponseTimes.concat(workerData.optimized.responseTimes);
    
    // Combine errors
    baseErrors += workerData.base.errors;
    optimizedErrors += workerData.optimized.errors;
    
    // Combine error types
    Object.entries(workerData.base.errorsByType).forEach(([type, count]) => {
      baseErrorsByType[type] = (baseErrorsByType[type] || 0) + count;
    });
    
    Object.entries(workerData.optimized.errorsByType).forEach(([type, count]) => {
      optimizedErrorsByType[type] = (optimizedErrorsByType[type] || 0) + count;
    });
    
    // Add request counts over time
    if (workerData.base.requestCounts?.length) {
      baseRequestsOverTime = baseRequestsOverTime.concat(workerData.base.requestCounts);
    }
    
    if (workerData.optimized.requestCounts?.length) {
      optimizedRequestsOverTime = optimizedRequestsOverTime.concat(workerData.optimized.requestCounts);
    }
  });
  
  // Calculate averages, min, max for response times
  const baseTotalRequests = baseResponseTimes.length + baseErrors;
  const optimizedTotalRequests = optimizedResponseTimes.length + optimizedErrors;
  
  const baseAvgResponseTime = baseResponseTimes.length > 0 
    ? baseResponseTimes.reduce((sum, time) => sum + time, 0) / baseResponseTimes.length 
    : 0;
  
  const optimizedAvgResponseTime = optimizedResponseTimes.length > 0 
    ? optimizedResponseTimes.reduce((sum, time) => sum + time, 0) / optimizedResponseTimes.length 
    : 0;
  
  const baseMinResponseTime = baseResponseTimes.length > 0 
    ? Math.min(...baseResponseTimes) 
    : 0;
  
  const optimizedMinResponseTime = optimizedResponseTimes.length > 0 
    ? Math.min(...optimizedResponseTimes) 
    : 0;
  
  const baseMaxResponseTime = baseResponseTimes.length > 0 
    ? Math.max(...baseResponseTimes) 
    : 0;
  
  const optimizedMaxResponseTime = optimizedResponseTimes.length > 0 
    ? Math.max(...optimizedResponseTimes) 
    : 0;
  
  // Calculate requests per second
  const testDurationSeconds = CONFIG.testDuration / 1000;
  const baseRequestsPerSecond = baseTotalRequests / testDurationSeconds;
  const optimizedRequestsPerSecond = optimizedTotalRequests / testDurationSeconds;
  
  // Calculate error rates
  const baseErrorRate = baseTotalRequests > 0 
    ? (baseErrors / baseTotalRequests) * 100 
    : 0;
  
  const optimizedErrorRate = optimizedTotalRequests > 0 
    ? (optimizedErrors / optimizedTotalRequests) * 100 
    : 0;
  
  // Calculate improvements
  const responseTimeImprovement = baseAvgResponseTime > 0 
    ? ((baseAvgResponseTime - optimizedAvgResponseTime) / baseAvgResponseTime) * 100 
    : 0;
  
  const throughputImprovement = baseRequestsPerSecond > 0 
    ? ((optimizedRequestsPerSecond - baseRequestsPerSecond) / baseRequestsPerSecond) * 100 
    : 0;
  
  const errorRateImprovement = baseErrorRate > 0 
    ? ((baseErrorRate - optimizedErrorRate) / baseErrorRate) * 100 
    : 0;

  // Calculate a scalability score (0-10)
  // This considers throughput increase, response time stability, and error rate reduction
  const scalabilityScore = Math.min(10, Math.max(0,
    (throughputImprovement / 20) + // 5 points for 100% throughput improvement
    (5 - Math.abs(responseTimeImprovement) / 20) + // 5 points for stable response time
    (5 * (1 - optimizedErrorRate / 100)) // 5 points for low error rates
  ));
  
  // Update results
  results.summary.base = {
    totalRequests: baseTotalRequests,
    successfulRequests: baseResponseTimes.length,
    failedRequests: baseErrors,
    avgResponseTime: baseAvgResponseTime,
    minResponseTime: baseMinResponseTime,
    maxResponseTime: baseMaxResponseTime,
    requestsPerSecond: baseRequestsPerSecond,
    errorRate: baseErrorRate
  };
  
  results.summary.optimized = {
    totalRequests: optimizedTotalRequests,
    successfulRequests: optimizedResponseTimes.length,
    failedRequests: optimizedErrors,
    avgResponseTime: optimizedAvgResponseTime,
    minResponseTime: optimizedMinResponseTime,
    maxResponseTime: optimizedMaxResponseTime,
    requestsPerSecond: optimizedRequestsPerSecond,
    errorRate: optimizedErrorRate
  };
  
  results.comparison = {
    responseTimeImprovement,
    throughputImprovement,
    errorRateImprovement,
    scalabilityScore
  };
  
  results.detailedMetrics.base.responseTimes = baseResponseTimes;
  results.detailedMetrics.optimized.responseTimes = optimizedResponseTimes;
  results.detailedMetrics.base.errorsByType = baseErrorsByType;
  results.detailedMetrics.optimized.errorsByType = optimizedErrorsByType;
  results.detailedMetrics.base.requestsOverTime = baseRequestsOverTime;
  results.detailedMetrics.optimized.requestsOverTime = optimizedRequestsOverTime;
  
  return {
    base: results.summary.base,
    optimized: results.summary.optimized,
    comparison: results.comparison
  };
}

/**
 * Run the multi-instance benchmark
 */
async function runMultiInstanceBenchmark() {
  console.log('==================================================');
  console.log('    MULTI-INSTANCE BENCHMARK - COMPARING SCALING  ');
  console.log('==================================================\n');
  console.log(`KTPM-base URL: ${CONFIG.baseUrl} (single instance)`);
  console.log(`KTPM-btl URL: ${CONFIG.optimizedUrl} (${CONFIG.workerCount} instances with load balancing)`);
  console.log(`Concurrent Users: ${CONFIG.concurrentUsers}`);
  console.log(`Requests per User: ${CONFIG.requestsPerUser}`);
  console.log(`Total simulated requests: ~${CONFIG.concurrentUsers * CONFIG.requestsPerUser}`);
  console.log(`Test duration: ${CONFIG.testDuration / 1000} seconds`);
  console.log(`Worker threads: ${CONFIG.workerCount}`);
  console.log('--------------------------------------------------\n');
  
  try {
    // Prepare test data
    await prepareTestData();
    
    console.log('\nStarting benchmark with worker threads...');
    const workers = [];
    const workerResults = [];
    
    // Create worker threads
    for (let i = 0; i < CONFIG.workerCount; i++) {
      workers[i] = new Worker(__filename, {
        workerData: {
          ...CONFIG,
          totalWorkers: CONFIG.workerCount,
          workerId: i
        }
      });
      
      workers[i].on('message', data => {
        workerResults.push(data);
        console.log(`Worker ${i + 1}/${CONFIG.workerCount} completed`);
      });
      
      workers[i].on('error', err => {
        console.error(`Worker ${i + 1} error:`, err);
      });
    }
    
    // Wait for all workers to finish
    await Promise.all(workers.map(worker => {
      return new Promise((resolve) => {
        worker.on('exit', resolve);
      });
    }));
    
    console.log('All workers completed');
    
    // Calculate and display statistics
    const stats = calculateStatistics(workerResults);
    
    console.log('\n\n==================================================');
    console.log('              BENCHMARK RESULTS                   ');
    console.log('==================================================');
    
    console.log('\n--- KTPM-base (Single Instance):');
    console.log(`Total requests: ${stats.base.totalRequests}`);
    console.log(`Successful requests: ${stats.base.successfulRequests} (${(100 - stats.base.errorRate).toFixed(2)}%)`);
    console.log(`Average response time: ${stats.base.avgResponseTime.toFixed(2)}ms`);
    console.log(`Requests per second: ${stats.base.requestsPerSecond.toFixed(2)}`);
    console.log(`Error rate: ${stats.base.errorRate.toFixed(2)}%`);
    
    console.log('\n--- KTPM-btl (Multi-Instance):');
    console.log(`Total requests: ${stats.optimized.totalRequests}`);
    console.log(`Successful requests: ${stats.optimized.successfulRequests} (${(100 - stats.optimized.errorRate).toFixed(2)}%)`);
    console.log(`Average response time: ${stats.optimized.avgResponseTime.toFixed(2)}ms`);
    console.log(`Requests per second: ${stats.optimized.requestsPerSecond.toFixed(2)}`);
    console.log(`Error rate: ${stats.optimized.errorRate.toFixed(2)}%`);
    
    console.log('\n--- Improvements with Multi-Instance Architecture:');
    console.log(`Response time: ${stats.comparison.responseTimeImprovement > 0 ? 'Faster by' : 'Slower by'} ${Math.abs(stats.comparison.responseTimeImprovement).toFixed(2)}%`);
    console.log(`Throughput: ${stats.comparison.throughputImprovement > 0 ? 'Increased by' : 'Decreased by'} ${Math.abs(stats.comparison.throughputImprovement).toFixed(2)}%`);
    console.log(`Error rate: ${stats.comparison.errorRateImprovement > 0 ? 'Reduced by' : 'Increased by'} ${Math.abs(stats.comparison.errorRateImprovement).toFixed(2)}%`);
    console.log(`Scalability score: ${stats.comparison.scalabilityScore.toFixed(1)}/10`);
    
    // Save results to a file
    fs.writeFileSync(CONFIG.resultFile, JSON.stringify(results, null, 2));
    console.log(`\nDetailed results saved to ${CONFIG.resultFile}`);

    // Return results for module usage
    return stats;
    
  } catch (error) {
    console.error('Error in benchmark execution:', error);
    throw error;
  }
}

// Run benchmark only if this script is executed directly (not when imported as a module)
if (isMainThread && require.main === module) {
  runMultiInstanceBenchmark().catch(err => console.error('Unhandled error:', err));
} else if (!isMainThread) {
  // This code runs in worker threads
  workerFunction();
}

module.exports = { runMultiInstanceBenchmark };