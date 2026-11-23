// ============================================================
// Meridian ERP - Authentication Controller
// Handles user registration, credentials email dispatch,
// login, JWT issuance, and password recovery.
// ============================================================

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendWelcomeCredentialsEmail, sendPasswordResetEmail } = require('../utils/mailer');

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

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
// REGISTER a new user & workspace
// POST /api/v1/auth/register
// -------------------------
const register = async (req, res) => {
  try {
    const { name, email, password, company_name, tenant_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'This email is already registered. Please sign in instead.' });
    }

    // 2. Hash password using bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Determine tenant ID: If user is self-registering a new company, generate a new tenant UUID
    // If tenant_id was explicitly provided (e.g., an invitation to an existing workspace), use that
    const assignedTenantId = tenant_id || uuidv4();
    const assignedRole = tenant_id ? 'viewer' : 'admin'; // First user in new tenant is the Admin
    const company = company_name ? company_name.trim() : `${name.trim()}'s Workspace`;

    const id = uuidv4();
    const result = await query(
      `INSERT INTO users (id, name, email, password, role, tenant_id, company_name, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING id, name, email, role, tenant_id, company_name, created_at`,
      [id, name.trim(), normalizedEmail, hashedPassword, assignedRole, assignedTenantId, company]
    );

    const user = result.rows[0];

    // 4. Generate JWT token for immediate sign-in
    const token = generateToken(user);

    // 5. Send onboarding email with workspace details and username (no password for security)
    sendWelcomeCredentialsEmail({
      to: normalizedEmail,
      name: user.name,
      email: normalizedEmail,
      companyName: company
    }).catch(err => console.error('Error dispatching credentials email:', err));

    res.status(201).json({
      success: true,
      message: 'Account created successfully! An email with your workspace details has been dispatched.',
      data: { user, token }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// -------------------------
// LOGIN
// POST /api/v1/auth/login
// -------------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user by email
    const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact your workspace administrator.' });
    }

    // 2. Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // 3. Generate JWT token
    const token = generateToken(user);

    // Remove password and sensitive reset fields from response
    const { password: _, reset_password_token: __, reset_password_expires: ___, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userWithoutPassword, token }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// -------------------------
// FORGOT PASSWORD
// POST /api/v1/auth/forgot-password
// -------------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await query('SELECT id, name, email FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Generate 6-digit or hex reset token
      const resetToken = crypto.randomBytes(16).toString('hex').toUpperCase();

      await query(
        `UPDATE users 
         SET reset_password_token = $1, reset_password_expires = NOW() + INTERVAL '1 hour'
         WHERE id = $2`,
        [resetToken, user.id]
      );

      // Dispatch reset email
      sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetToken: resetToken
      }).catch(err => console.error('Error dispatching reset email:', err));
    }

    // Always return success for security (prevents user enumeration)
    res.json({
      success: true,
      message: 'If your email is registered in Bizosuite, password reset instructions have been sent to your inbox.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process password reset request' });
  }
};

// -------------------------
// RESET PASSWORD
// POST /api/v1/auth/reset-password
// -------------------------
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, reset token, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    // Verify token exists and has not expired
    const result = await query(
      `SELECT id, name, email FROM users 
       WHERE LOWER(email) = $1 AND reset_password_token = $2 AND reset_password_expires > NOW()`,
      [normalizedEmail, cleanToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await query(
      `UPDATE users 
       SET password = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = NOW() 
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

// -------------------------
// GET current user profile
// GET /api/v1/auth/me
// -------------------------
const getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, tenant_id, company_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
};

// -------------------------
// HELPER: Generate JWT Token
// -------------------------
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tenant_id: user.tenant_id || DEFAULT_TENANT_ID
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { register, login, forgotPassword, resetPassword, getMe };
