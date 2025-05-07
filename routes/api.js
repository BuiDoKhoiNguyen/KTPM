const express = require('express');
const router = express.Router();
const path = require('path');
const { writeData, readData, getAllKeys } = require('../services/dataService');

router.post('/add', async (req, res) => {
  try {
    const { key, value, category } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    await writeData(key, value, category);
    res.status(200).json({ success: true, message: 'Value stored successfully' });
  } catch (error) {
    console.error('Error in /add endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

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

router.get('/benchmark-report', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/visualize-benchmark.html'));
});

router.get('/socket-vs-polling', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/socket-vs-polling-visualize.html'));
});

module.exports = router;