// tests/performance/monitor-resources.js
const { exec } = require('child_process');
const fs = require('fs');

// Cấu hình
const DURATION = 300; // Thời gian giám sát (giây)
const INTERVAL = 5; // Khoảng thời gian giữa các lần lấy mẫu (giây)
const RESULTS_FILE = 'system-resources-results.json';

async function monitorResources() {
  console.log(`Bắt đầu giám sát tài nguyên hệ thống trong ${DURATION} giây...`);
  
  const samples = [];
  let count = 0;
  const maxSamples = Math.floor(DURATION / INTERVAL);
  
  // Hàm lấy mẫu tài nguyên
  function sampleResources() {
    return new Promise((resolve, reject) => {
      // Lấy thông tin CPU và Memory của Node.js process
      exec('ps -p $(pgrep -f "node.*server.js") -o %cpu,%mem', (error, stdout) => {
        if (error) {
          console.error('Lỗi khi lấy thông tin process:', error);
          resolve({ cpu: 0, memory: 0, timestamp: Date.now() });
          return;
        }
        
        const lines = stdout.trim().split('\n');
        if (lines.length < 2) {
          console.warn('Không tìm thấy process Node.js');
          resolve({ cpu: 0, memory: 0, timestamp: Date.now() });
          return;
        }
        
        const values = lines[1].trim().split(/\s+/);
        const cpu = parseFloat(values[0]);
        const memory = parseFloat(values[1]);
        
        // Lấy thông tin Docker containers
        exec('docker stats --no-stream --format "{{.Name}}: {{.CPUPerc}}, {{.MemPerc}}"', (error, stdout) => {
          if (error) {
            console.error('Lỗi khi lấy thông tin Docker:', error);
            resolve({ 
              cpu, 
              memory, 
              docker: {}, 
              timestamp: Date.now() 
            });
            return;
          }
          
          const dockerStats = {};
          stdout.trim().split('\n').forEach(line => {
            const [name, stats] = line.split(': ');
            if (stats) {
              const [cpuStr, memStr] = stats.split(', ');
              dockerStats[name] = {
                cpu: parseFloat(cpuStr.replace('%', '')),
                memory: parseFloat(memStr.replace('%', ''))
              };
            }
          });
          
          resolve({ 
            cpu, 
            memory, 
            docker: dockerStats, 
            timestamp: Date.now() 
          });
        });
      });
    });
  }
  
  // Lấy mẫu theo khoảng thời gian
  const interval = setInterval(async () => {
    const sample = await sampleResources();
    samples.push(sample);
    count++;
    
    console.log(`Mẫu #${count}/${maxSamples}: CPU=${sample.cpu.toFixed(2)}%, Memory=${sample.memory.toFixed(2)}%`);
    
    if (count >= maxSamples) {
      clearInterval(interval);
      finishMonitoring();
    }
  }, INTERVAL * 1000);
  
  function finishMonitoring() {
    // Tính toán các chỉ số
    const cpuValues = samples.map(s => s.cpu);
    const memValues = samples.map(s => s.memory);
    
    const calculateStats = (values) => {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      
      return { avg, median, min, max };
    };
    
    const cpuStats = calculateStats(cpuValues);
    const memStats = calculateStats(memValues);
    
    // Tính toán thống kê cho các container Docker
    const dockerContainers = {};
    samples.forEach(sample => {
      Object.keys(sample.docker).forEach(container => {
        if (!dockerContainers[container]) {
          dockerContainers[container] = {
            cpu: [],
            memory: []
          };
        }
        
        dockerContainers[container].cpu.push(sample.docker[container].cpu);
        dockerContainers[container].memory.push(sample.docker[container].memory);
      });
    });
    
    const dockerStats = {};
    Object.keys(dockerContainers).forEach(container => {
      dockerStats[container] = {
        cpu: calculateStats(dockerContainers[container].cpu),
        memory: calculateStats(dockerContainers[container].memory)
      };
    });
    
    // Lưu kết quả
    const results = {
      duration: DURATION,
      interval: INTERVAL,
      samples: samples.length,
      nodeProcess: {
        cpu: cpuStats,
        memory: memStats
      },
      dockerContainers: dockerStats,
      rawData: samples
    };
    
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    
    // In kết quả
    console.log('\n===== KẾT QUẢ GIÁM SÁT TÀI NGUYÊN HỆ THỐNG =====');
    console.log(`Thời gian giám sát: ${DURATION} giây`);
    console.log(`Số lượng mẫu: ${samples.length}`);
    
    console.log('\nNode.js Process:');
    console.log(`  CPU trung bình: ${cpuStats.avg.toFixed(2)}%`);
    console.log(`  CPU cao nhất: ${cpuStats.max.toFixed(2)}%`);
    console.log(`  Memory trung bình: ${memStats.avg.toFixed(2)}%`);
    console.log(`  Memory cao nhất: ${memStats.max.toFixed(2)}%`);
    
    console.log('\nDocker Containers:');
    Object.keys(dockerStats).forEach(container => {
      console.log(`  ${container}:`);
      console.log(`    CPU trung bình: ${dockerStats[container].cpu.avg.toFixed(2)}%`);
      console.log(`    CPU cao nhất: ${dockerStats[container].cpu.max.toFixed(2)}%`);
      console.log(`    Memory trung bình: ${dockerStats[container].memory.avg.toFixed(2)}%`);
      console.log(`    Memory cao nhất: ${dockerStats[container].memory.max.toFixed(2)}%`);
    });
    
    console.log('\nKết quả chi tiết đã được lưu vào file:', RESULTS_FILE);
  }
}

monitorResources();
