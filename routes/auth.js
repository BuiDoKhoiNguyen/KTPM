const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');

// Đăng ký
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }
    
    const user = await authService.register({ username, password, email });
    res.status(201).json({ 
      success: true, 
      message: 'Đăng ký thành công',
      user 
    });
  } catch (error) {
    next(error);
  }
});

// Đăng nhập
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }
    
    const result = await authService.login(username, password);
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      ...result
    });
  } catch (error) {
    next(error);
  }
});

// Đổi mật khẩu (yêu cầu xác thực)
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }
    
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Lấy thông tin người dùng hiện tại (yêu cầu xác thực)
router.get('/me', authenticate, async (req, res) => {
  // Loại bỏ mật khẩu trước khi trả về
  const { password, ...userWithoutPassword } = req.user.toJSON();
  res.status(200).json({ user: userWithoutPassword });
});

module.exports = router;