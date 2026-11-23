// ============================================================
// LEARN: Middleware = functions that run BETWEEN request and response
// Think of it as a pipeline: Request → middleware1 → middleware2 → Route Handler → Response
//
// This file has TWO middleware functions:
// 1. verifyToken  → checks if the user sent a valid JWT
// 2. requireRole  → checks if the user has the right permissions (RBAC)
// ============================================================

const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
    }
    return 'bizsuite_dev_secret_key_2024_change_in_production';
  }
  return secret;
};

// -------------------------
// MIDDLEWARE 1: verifyToken
// -------------------------
// JWT = JSON Web Token. It's like a digital ID card.
// When user logs in, server gives them a token.
// On every request, client sends token in header → server verifies it.
const verifyToken = (req, res, next) => {
  // Token comes in Authorization header: "Bearer eyJhbGci..."
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract after "Bearer "

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // jwt.verify() decodes and validates the token using our secret key
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded; // Attach user info to request object
    next(); // Move to next middleware or route handler
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

// -------------------------
// MIDDLEWARE 2: requireRole (RBAC - Role Based Access Control)
// -------------------------
// RBAC = different users have different permissions
// Example: 'admin' can delete, 'manager' can edit, 'viewer' can only read
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };
