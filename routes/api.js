const express = require('express');
const router = express.Router();
const path = require('path');
const { writeData, readData, getDataHistory, getAllKeys } = require('../services/dataService');

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

router.get('/get/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const value = await readData(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    res.status(200).send(value);
  } catch (error) {
    console.error('Error in /get endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const history = await getDataHistory(key, limit);
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error in /history endpoint:', error);
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