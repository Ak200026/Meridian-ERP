const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

// Enterprise Rate Limiting for Auth Endpoints (Protection against brute-force & credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 20, // max 20 login/recovery attempts per 15 minutes per IP
  standardHeaders: true, // draft-6 RateLimit headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

// POST /api/v1/auth/register - Self-serve registration + welcome credentials email
router.post('/register', authLimiter, register);

// POST /api/v1/auth/login - User sign-in
router.post('/login', authLimiter, login);

// POST /api/v1/auth/forgot-password - Request password reset token via email
router.post('/forgot-password', authLimiter, forgotPassword);

// POST /api/v1/auth/reset-password - Verify token and update password
router.post('/reset-password', authLimiter, resetPassword);

// GET /api/v1/auth/me - Protected current profile
router.get('/me', verifyToken, getMe);

module.exports = router;
