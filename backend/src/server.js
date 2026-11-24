// ============================================================
// Meridian ERP - Enterprise Backend Server
// Express = minimal web framework for Node.js
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import route files (each module handles its own domain)
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const salesRoutes = require('./routes/sales.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// SECURITY & MIDDLEWARE SETUP
// ============================================================

// 1. HTTP Security Headers (XSS, HSTS, Sniffing & Clickjacking protection)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Strict CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
      // In development or if allowedOrigins includes '*' or matches domain, allow
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: Origin "${origin}" is not authorized.`));
      }
    },
    credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
  }));

// 3. Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// API ROUTES
// Versioned enterprise REST endpoints under /api/v1
// ============================================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/purchase', purchaseRoutes);
app.use('/api/v1/ai', aiRoutes);

// Health check endpoint (for DevOps monitoring & load balancers)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    app: 'Meridian ERP API',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

// 404 handler - catches undefined routes
app.use('/{*path}', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║     🚀 Meridian ERP Backend          ║
  ║     Running on port ${PORT}             ║
  ║     Environment: ${process.env.NODE_ENV || 'development'}       ║
  ║     http://localhost:${PORT}            ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
