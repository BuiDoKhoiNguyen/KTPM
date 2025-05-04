const express = require('express');
const router = express.Router();
const path = require('path');
const { writeData, readData, getAllKeys } = require('../services/dataService');
const { postLimiter, adminLimiter, getLimiter } = require('../middleware/rateLimiter');

// Áp dụng rate limit nghiêm ngặt hơn cho API POST (thêm/sửa dữ liệu)
router.post('/add', async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    await writeData(key, value, null);
    res.status(200).json({ success: true, message: 'Value stored successfully' });
  } catch (error) {
    console.error('Error in /add endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Áp dụng rate limit cho API GET
router.get('/get/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const result = await readData(key);
    
    if (result === null) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /get endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/viewer/:key', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/viewer.html'));
});

router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

router.get('/keys', async (req, res) => {
  try {
    const keys = await getAllKeys();
    res.status(200).json({
      success: true,
      data: keys
    });
  } catch (error) {
    console.error('Error in /keys endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;