/**
 * Socket vs Polling Benchmark
 * 
 * File này có mục đích so sánh hiệu suất giữa Socket.IO (KTPM-btl) và HTTP Polling (KTPM-base)
 */

const axios = require('axios');
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Cấu hình benchmark
const CONFIG = {
  serverUrls: {
    btl: 'http://localhost:8080', // KTPM-btl (Socket.IO)
    base: 'http://localhost:8888', // KTPM-base (HTTP Polling)
  },
  testDuration: 60, // Thời gian chạy test (giây)
  pollingInterval: 1000, // Khoảng thời gian giữa các polling request (ms)
  concurrentClients: 50, // Số lượng client đồng thời
  testKeys: Array.from({ length: 10 }, (_, i) => `socket_polling_test_${i}`),
  resultFile: path.join(__dirname, 'public/socket-vs-polling-results.json'),
  updateFrequency: 500, // Tần suất cập nhật dữ liệu (ms)
};

// Khởi tạo biến lưu trữ kết quả
const results = {
  timestamp: new Date().toISOString(),
  metadata: {
    duration: CONFIG.testDuration,
    concurrentClients: CONFIG.concurrentClients,
    pollingInterval: CONFIG.pollingInterval,
    updateFrequency: CONFIG.updateFrequency,
    system: {
      platform: os.platform(),
      cpuCores: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024)) + 'MB',
    }
  },
  socket: {
    messagesReceived: 0,
    latencies: [],
    avgLatency: 0,
    minLatency: 0, 
    maxLatency: 0,
    bandwidth: 0,
    connectionTime: 0,
    disconnectionTime: 0,
    errors: 0,
  },
  polling: {
    requestsMade: 0,
    responsesReceived: 0,
    updatesDetected: 0,
    latencies: [],
    avgLatency: 0,
    minLatency: 0,
    maxLatency: 0,
    bandwidth: 0,
    errors: 0,
  },
  comparison: {
    latencyImprovement: 0,
    reliabilityComparison: 0,
  },
  systemLoad: {
    cpuUsage: [],
    memoryUsage: [],
    avgCpuUsage: 0,
    avgMemoryUsage: 0,
  }
};

// Biến theo dõi dữ liệu hiện tại
const currentData = {};

/**
 * Tạo dữ liệu ban đầu cho test
 */
async function setupTestData() {
  console.log('\nĐang chuẩn bị dữ liệu test...');
  
  // Chuẩn bị dữ liệu cho cả hai server
  for (const key of CONFIG.testKeys) {
    try {
      // Server KTPM-btl (Socket.IO)
      await axios.post(`${CONFIG.serverUrls.btl}/add`, { 
        key, 
        value: `Initial value for ${key} at ${Date.now()}`,
        category: 'test_socket_polling' 
      });
      console.log(`✓ Khởi tạo key: ${key} trên KTPM-btl`);
      
      // Server KTPM-base (Polling)
      try {
        await axios.post(`${CONFIG.serverUrls.base}/add`, { 
          key, 
          value: `Initial value for ${key} at ${Date.now()}`,
        });
        console.log(`✓ Khởi tạo key: ${key} trên KTPM-base`);
      } catch (baseErr) {
        console.error(`✗ Lỗi khởi tạo key ${key} trên KTPM-base:`, baseErr.message);
      }
      
      currentData[key] = { value: `Initial value for ${key}`, updatedAt: Date.now() };
    } catch (err) {
      console.error(`✗ Lỗi khởi tạo key ${key}:`, err.message);
    }
  }
}

/**
 * Hàm để cập nhật giá trị mới ngẫu nhiên trên cả hai server
 */
async function updateRandomValue() {
  try {
    const randomIndex = Math.floor(Math.random() * CONFIG.testKeys.length);
    const key = CONFIG.testKeys[randomIndex];
    const newValue = `Updated value at ${Date.now()}`;
    
    // Cập nhật trên server KTPM-btl (Socket.IO)
    await axios.post(`${CONFIG.serverUrls.btl}/add`, { 
      key, 
      value: newValue,
      category: 'test_socket_polling' 
    });
    
    // Cập nhật trên server KTPM-base (Polling)
    try {
      await axios.post(`${CONFIG.serverUrls.base}/add`, { 
        key, 
        value: newValue,
      });
    } catch (baseErr) {
      console.error(`Lỗi khi cập nhật giá trị trên KTPM-base:`, baseErr.message);
    }
    
    currentData[key] = { value: newValue, updatedAt: Date.now() };
    return { key, value: newValue, timestamp: Date.now() };
  } catch (err) {
    console.error('Lỗi khi cập nhật giá trị:', err.message);
    return null;
  }
}

/**
 * Khởi tạo socket client và bắt đầu theo dõi
 */
function createSocketClient(clientId) {
  return new Promise((resolve) => {
    console.log(`[Socket ${clientId}] Đang kết nối...`);
    const startConnectTime = Date.now();
    
    const socket = io(CONFIG.serverUrls.btl, {
      transports: ['websocket'],
      reconnection: true,
    });
    
    // Xử lý sự kiện kết nối
    socket.on('connect', () => {
      const connectionTime = Date.now() - startConnectTime;
      console.log(`[Socket ${clientId}] Đã kết nối sau ${connectionTime}ms`);
      results.socket.connectionTime += connectionTime;
      
      // Subscribe tới tất cả các test keys
      CONFIG.testKeys.forEach(key => {
        socket.emit('subscribe', key);
      });
      
      socket.on('subscribed', (data) => {
        console.log(`[Socket ${clientId}] Đã subscribe tới ${data.key}`);
      });
      
      // Lắng nghe cập nhật giá trị
      socket.on('valueUpdate', (data) => {
        const now = Date.now();
        const latency = now - data.timestamp;
        results.socket.latencies.push(latency);
        results.socket.messagesReceived++;
        
        if (clientId === 0 && results.socket.messagesReceived % 10 === 0) {
          console.log(`[Socket Stats] Đã nhận ${results.socket.messagesReceived} tin nhắn`);
        }
      });
      
      // Xử lý lỗi
      socket.on('error', (error) => {
        results.socket.errors++;
        console.error(`[Socket ${clientId}] Lỗi:`, error);
      });
      
      resolve(socket);
    });
  });
}

/**
 * Thực hiện polling liên tục trên KTPM-base
 */
async function startPolling(clientId) {
  const pollingData = {
    requestsMade: 0,
    responsesReceived: 0,
    updatesDetected: 0,
    lastValues: {},
    errors: 0,
  };

  // Khởi tạo giá trị ban đầu cho tất cả các keys
  for (const key of CONFIG.testKeys) {
    pollingData.lastValues[key] = null;
  }

  // Hàm thực hiện một lần polling
  const doPoll = async () => {
    for (const key of CONFIG.testKeys) {
      try {
        pollingData.requestsMade++;
        results.polling.requestsMade++;
        
        const startTime = Date.now();
        const response = await axios.get(`${CONFIG.serverUrls.base}/get/${key}`);
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        results.polling.latencies.push(latency);
        pollingData.responsesReceived++;
        results.polling.responsesReceived++;
        
        // KTPM-base trả về giá trị trực tiếp, không phải là JSON object
        const responseValue = response.data;
        
        // Kiểm tra xem dữ liệu có thay đổi không
        if (pollingData.lastValues[key] !== responseValue) {
          pollingData.lastValues[key] = responseValue;
          pollingData.updatesDetected++;
          results.polling.updatesDetected++;
        }
      } catch (err) {
        pollingData.errors++;
        results.polling.errors++;
        console.error(`[Polling ${clientId}] Lỗi với key ${key}:`, err.message);
      }
    }
  };
  
  // Bắt đầu polling định kỳ
  const intervalId = setInterval(async () => {
    await doPoll();
    
    if (clientId === 0 && results.polling.requestsMade % 100 === 0) {
      console.log(`[Polling Stats] Đã thực hiện ${results.polling.requestsMade} requests, phát hiện ${results.polling.updatesDetected} cập nhật`);
    }
  }, CONFIG.pollingInterval);
  
  return {
    stop: () => clearInterval(intervalId),
    data: pollingData
  };
}

/**
 * Theo dõi CPU và bộ nhớ sử dụng
 */
function monitorSystemResources() {
  const intervalId = setInterval(() => {
    const cpuUsage = os.loadavg()[0]; // 1 phút load average
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    results.systemLoad.cpuUsage.push(cpuUsage);
    results.systemLoad.memoryUsage.push(memoryUsagePercent);
  }, 1000); // Cập nhật mỗi giây
  
  return () => clearInterval(intervalId);
}

/**
 * Tính toán kết quả thống kê cuối cùng
 */
function calculateFinalResults() {
  console.log('\nĐang tính toán kết quả...');
  
  // Socket statistics
  if (results.socket.latencies.length > 0) {
    results.socket.avgLatency = results.socket.latencies.reduce((a, b) => a + b, 0) / results.socket.latencies.length;
    results.socket.minLatency = Math.min(...results.socket.latencies);
    results.socket.maxLatency = Math.max(...results.socket.latencies);
    results.socket.connectionTime = results.socket.connectionTime / CONFIG.concurrentClients; // Average connection time
  }
  
  // Polling statistics
  if (results.polling.latencies.length > 0) {
    results.polling.avgLatency = results.polling.latencies.reduce((a, b) => a + b, 0) / results.polling.latencies.length;
    results.polling.minLatency = Math.min(...results.polling.latencies);
    results.polling.maxLatency = Math.max(...results.polling.latencies);
  }
  
  // System resource usage
  if (results.systemLoad.cpuUsage.length > 0) {
    results.systemLoad.avgCpuUsage = results.systemLoad.cpuUsage.reduce((a, b) => a + b, 0) / results.systemLoad.cpuUsage.length;
    results.systemLoad.avgMemoryUsage = results.systemLoad.memoryUsage.reduce((a, b) => a + b, 0) / results.systemLoad.memoryUsage.length;
  }
  
  // So sánh Socket vs Polling
  if (results.polling.avgLatency > 0 && results.socket.avgLatency > 0) {
    results.comparison.latencyImprovement = ((results.polling.avgLatency - results.socket.avgLatency) / results.polling.avgLatency) * 100;
  }
  
  // Tính toán độ tin cậy
  const socketReliability = results.socket.messagesReceived > 0 ?
    (results.socket.messagesReceived - results.socket.errors) / results.socket.messagesReceived * 100 : 0;
  
  const pollingReliability = results.polling.requestsMade > 0 ? 
    (results.polling.responsesReceived - results.polling.errors) / results.polling.requestsMade * 100 : 0;
  
  results.comparison.reliabilityComparison = socketReliability - pollingReliability;
  
  // Lưu kết quả
  fs.writeFileSync(CONFIG.resultFile, JSON.stringify(results, null, 2));
  console.log(`Đã lưu kết quả chi tiết vào ${CONFIG.resultFile}`);
}

/**
 * In kết quả ra console
 */
function printResults() {
  console.log('\n==================================================');
  console.log('       KẾT QUẢ SO SÁNH SOCKET VS POLLING        ');
  console.log('==================================================\n');
  
  console.log('--- SOCKET.IO (KTPM-btl):');
  console.log(`Thời gian kết nối trung bình: ${results.socket.connectionTime.toFixed(2)}ms`);
  console.log(`Tin nhắn đã nhận: ${results.socket.messagesReceived}`);
  console.log(`Latency trung bình: ${results.socket.avgLatency.toFixed(2)}ms`);
  console.log(`Min latency: ${results.socket.minLatency.toFixed(2)}ms`);
  console.log(`Max latency: ${results.socket.maxLatency.toFixed(2)}ms`);
  console.log(`Số lỗi: ${results.socket.errors}`);
  
  console.log('\n--- HTTP POLLING (KTPM-base):');
  console.log(`Requests đã thực hiện: ${results.polling.requestsMade}`);
  console.log(`Responses đã nhận: ${results.polling.responsesReceived}`);
  console.log(`Updates phát hiện được: ${results.polling.updatesDetected}`);
  console.log(`Latency trung bình: ${results.polling.avgLatency.toFixed(2)}ms`);
  console.log(`Min latency: ${results.polling.minLatency.toFixed(2)}ms`);
  console.log(`Max latency: ${results.polling.maxLatency.toFixed(2)}ms`);
  console.log(`Số lỗi: ${results.polling.errors}`);
  
  console.log('\n--- SO SÁNH:');
  console.log(`Socket.IO tốt hơn HTTP Polling: ${results.comparison.latencyImprovement.toFixed(2)}%`);
  console.log(`Độ tin cậy (+ là socket tốt hơn): ${results.comparison.reliabilityComparison.toFixed(2)}%`);
  
  console.log('\n--- TẢI HỆ THỐNG:');
  console.log(`CPU trung bình: ${results.systemLoad.avgCpuUsage.toFixed(2)}`);
  console.log(`Bộ nhớ trung bình: ${results.systemLoad.avgMemoryUsage.toFixed(2)}%`);
  
  console.log('\n==================================================');
}

/**
 * Hàm chạy chính
 */
async function main() {
  console.log('==================================================');
  console.log('      BENCHMARK SOCKET.IO VS HTTP POLLING         ');
  console.log('==================================================');
  console.log(`Socket.IO (KTPM-btl): ${CONFIG.serverUrls.btl}`);
  console.log(`HTTP Polling (KTPM-base): ${CONFIG.serverUrls.base}`);
  console.log(`Số lượng clients: ${CONFIG.concurrentClients}`);
  console.log(`Thời gian test: ${CONFIG.testDuration} giây`);
  console.log(`Polling interval: ${CONFIG.pollingInterval}ms`);
  console.log(`Update frequency: ${CONFIG.updateFrequency}ms`);
  console.log('--------------------------------------------------');
  
  try {
    // Debug: Kiểm tra cấu hình URL
    console.log('Debug - URL hiện tại:');
    console.log('KTPM-btl:', CONFIG.serverUrls.btl);
    console.log('KTPM-base:', CONFIG.serverUrls.base);
    
    // Kiểm tra kết nối đến cả hai server
    try {
      await axios.get(`${CONFIG.serverUrls.btl}/keys`);
      console.log('✓ Kết nối thành công đến KTPM-btl');
    } catch (err) {
      console.error('✗ Lỗi kết nối đến KTPM-btl:', err.message);
      console.error('Vui lòng đảm bảo server KTPM-btl đang chạy ở cổng 8080');
      return;
    }
    
    try {
      // Sử dụng /get/test để kiểm tra kết nối đến KTPM-base
      console.log(`Kiểm tra kết nối tới ${CONFIG.serverUrls.base}...`);
      const response = await axios.get(`${CONFIG.serverUrls.base}/get/test`);
      console.log('✓ Kết nối thành công đến KTPM-base');
      console.log('  Status:', response.status);
    } catch (err) {
      console.error('✗ Lỗi kết nối đến KTPM-base:', err.message);
      console.error('Vui lòng đảm bảo server KTPM-base đang chạy ở cổng 8888');
      return;
    }
    
    // Thiết lập dữ liệu test
    await setupTestData();
    
    // Theo dõi tài nguyên hệ thống
    const stopMonitoring = monitorSystemResources();
    
    // Khởi tạo socket clients cho KTPM-btl
    console.log('\nĐang khởi tạo Socket clients cho KTPM-btl...');
    const socketClients = [];
    for (let i = 0; i < CONFIG.concurrentClients; i++) {
      const client = await createSocketClient(i);
      socketClients.push(client);
    }
    
    // Khởi tạo polling clients cho KTPM-base
    console.log('\nĐang khởi tạo Polling clients cho KTPM-base...');
    const pollingClients = [];
    for (let i = 0; i < CONFIG.concurrentClients; i++) {
      const client = await startPolling(i);
      pollingClients.push(client);
    }
    
    // Cập nhật dữ liệu ngẫu nhiên trong suốt thời gian test
    console.log('\nBắt đầu cập nhật dữ liệu ngẫu nhiên trên cả hai server...');
    const updateIntervalId = setInterval(async () => {
      await updateRandomValue();
    }, CONFIG.updateFrequency);
    
    // Đợi thời gian test hoàn tất
    console.log(`\nTest đang chạy trong ${CONFIG.testDuration} giây...`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.testDuration * 1000));
    
    // Dừng tất cả các tiến trình
    clearInterval(updateIntervalId);
    stopMonitoring();
    
    // Đóng socket clients
    console.log('\nĐang đóng Socket clients...');
    const disconnectStartTime = Date.now();
    await Promise.all(socketClients.map(socket => {
      return new Promise(resolve => {
        socket.on('disconnect', resolve);
        socket.disconnect();
      });
    }));
    results.socket.disconnectionTime = Date.now() - disconnectStartTime;
    
    // Dừng polling clients
    console.log('Đang dừng Polling clients cho KTPM-base...');
    pollingClients.forEach(client => client.stop());
    
    // Tính toán kết quả cuối cùng
    calculateFinalResults();
    
    // In kết quả
    printResults();
    
  } catch (error) {
    console.error('\nLỗi trong quá trình benchmark:', error);
  }
}

// Chạy test khi script được thực thi trực tiếp
if (require.main === module) {
  main().catch(err => console.error('Lỗi không xử lý được:', err));
}

module.exports = { main };