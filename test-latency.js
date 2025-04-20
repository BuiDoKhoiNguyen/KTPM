const axios = require('axios');

const run = async () => {
  const start = Date.now();
  const res = await axios.get('http://localhost:8888/get/test-key'); // cổng polling
  const delay = Date.now() - start;
  console.log(`Polling received value: ${res.data.value}, Delay: ${delay}ms`);
};

setInterval(run, 200);