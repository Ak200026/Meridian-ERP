// ============================================================
// PostgreSQL Database Connection Pool
// Supports Supabase DATABASE_URL, Cloud SSL, and Local Host
// ============================================================
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = !!process.env.DATABASE_URL;

const poolConfig = hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'bizsuite_erp',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: (process.env.DB_SSL === 'true' || (isProduction && process.env.DB_HOST !== 'localhost'))
        ? { rejectUnauthorized: false }
        : false
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,                  // Max 20 connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000,
  keepAlive: true
});

// CRITICAL: Handle errors on idle clients in the pool so ECONNRESET doesn't crash the server
pool.on('error', (err) => {
  console.warn('⚠️ Unexpected error on idle PostgreSQL client (recovered):', err.message);
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL database connection error:', err.message);
  } else {
    console.log('✅ PostgreSQL connected successfully to', process.env.DB_NAME || (hasDatabaseUrl ? 'Cloud Database' : 'bizsuite_erp'));
    release();
  }
});

// Helper: run a query easily
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
