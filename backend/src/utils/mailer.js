const nodemailer = require('nodemailer');

let cachedTransporter = null;

// Get or initialize mail transporter
const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  // 1. Production Gmail Service
  if (process.env.SMTP_SERVICE === 'gmail' || process.env.SMTP_HOST === 'smtp.gmail.com') {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS // 16-character Google App Password
      }
    });
    console.log(`📧 [Mailer] Configured Gmail SMTP service for ${process.env.SMTP_USER}`);
    return cachedTransporter;
  }

  // 2. Production Custom SMTP (Brevo, Resend, SendGrid, Mailgun, AWS SES)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log(`📧 [Mailer] Configured custom SMTP (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587})`);
    return cachedTransporter;
  }

  // 3. Development Fallback: Ethereal Online Test Mailer
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    cachedTransporter.isEthereal = true;
    console.log(`📧 [Mailer] Running in Development Mode. Live Ethereal test inbox active: ${testAccount.user}`);
    return cachedTransporter;
  } catch (err) {
    console.warn('⚠️ [Mailer] Failed to create Ethereal account, falling back to console logging:', err.message);
    cachedTransporter = {
      isMock: true,
      sendMail: async (options) => {
        console.log(`
        ╔════════════════════════════════════════════════════════════════════╗
        ║ 📧 [CONSOLE EMAIL DISPATCH] Message Dispatched                     ║
        ╠════════════════════════════════════════════════════════════════════╣
        ║ To:      ${options.to}
        ║ Subject: ${options.subject}
        ╠════════════════════════════════════════════════════════════════════╣
        ${options.text || options.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')}
        ╚════════════════════════════════════════════════════════════════════╝
        `);
        return { messageId: `mock-${Date.now()}` };
      }
    };
    return cachedTransporter;
  }
};

/**
 * Send welcome email with login details upon account creation (NO password for security)
 */
const sendWelcomeCredentialsEmail = async ({ to, name, email, companyName }) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';
  const from = process.env.SMTP_FROM || 'Bizosuite ERP <onboarding@resend.dev>';

  const subject = 'Welcome to Bizosuite ERP — Your Account Details';
  const text = `Hello ${name},

Welcome to Bizosuite ERP. Your enterprise workspace account has been created successfully.

Here are your account details:
------------------------------------------
Workspace / Company: ${companyName || 'Bizosuite Workspace'}
Username / Email:    ${email}
Login Portal:        ${loginUrl}
------------------------------------------

You can sign in anytime using the password you set during registration. If you ever forget your password, you can use the "Forgot password?" option on the sign-in page.

Best regards,
The Bizosuite Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #6366f1; font-size: 20px; margin: 0;">Bizosuite ERP</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Enterprise Resource Planning &amp; AI Intelligence</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">Your enterprise workspace account has been created successfully. You can now access your ERP dashboard and modules.</p>
      
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 600; color: #818cf8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Account Details</div>
        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 6px;">Workspace: <strong style="color: #f8fafc;">${companyName || 'Bizosuite Workspace'}</strong></div>
        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 6px;">Username: <strong style="color: #f8fafc;">${email}</strong></div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 10px; line-height: 1.4;">Use the password you created during sign-up to log in.</div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="background: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">Sign In to Workspace &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px;">
        For your security, passwords are never transmitted via email. If you ever forget your password, you can use the "Forgot password?" option on the sign-in page.
      </p>
    </div>
  `;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from, to, subject, text, html });

    if (transporter.isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`
      ╔════════════════════════════════════════════════════════════════════════════╗
      ║ 📬 [DEV EMAIL SENT TO ETHEREAL INBOX]                                       ║
      ║ To:          ${to}                                                         ║
      ║ Subject:     ${subject}                                                    ║
      ║ View Online: ${previewUrl} ║
      ╚════════════════════════════════════════════════════════════════════════════╝
      `);
    } else {
      console.log(`✅ [Mailer] Email successfully delivered to ${to} (MessageId: ${info.messageId})`);
    }

    return info;
  } catch (error) {
    console.error('❌ [Mailer Error] Failed to dispatch welcome email:', error.message);
    return null;
  }
};

/**
 * Send password reset email with reset token / link
 */
const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?resetToken=${resetToken}&email=${encodeURIComponent(to)}`;
  const from = process.env.SMTP_FROM || 'Bizosuite ERP <onboarding@resend.dev>';

  const subject = 'Bizosuite ERP — Password Reset Request';
  const text = `Hello ${name},

We received a request to reset your password for your Bizosuite ERP account.

Use the following Reset Token:
${resetToken}

Or click the link below to set a new password:
${resetUrl}

This token expires in 1 hour. If you did not request this, please ignore this email.

Best regards,
The Bizosuite Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #6366f1; font-size: 20px; margin: 0;">Bizosuite ERP</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Password Reset Request</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">We received a request to reset the password for your account. Use the token below or click the button to reset your password:</p>
      
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 14px; margin: 20px 0; text-align: center;">
        <div style="font-size: 11px; font-weight: 600; color: #818cf8; text-transform: uppercase; margin-bottom: 6px;">Reset Token</div>
        <div style="font-family: monospace; font-size: 16px; color: #38bdf8; letter-spacing: 0.1em; font-weight: 700;">${resetToken}</div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">Reset Password &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px;">
        This token is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from, to, subject, text, html });

    if (transporter.isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`
      ╔════════════════════════════════════════════════════════════════════════════╗
      ║ 📬 [DEV EMAIL SENT TO ETHEREAL INBOX]                                       ║
      ║ To:          ${to}                                                         ║
      ║ Subject:     ${subject}                                                    ║
      ║ View Online: ${previewUrl} ║
      ╚════════════════════════════════════════════════════════════════════════════╝
      `);
    } else {
      console.log(`✅ [Mailer] Reset email successfully delivered to ${to} (MessageId: ${info.messageId})`);
    }

    return info;
  } catch (error) {
    console.error('❌ [Mailer Error] Failed to dispatch password reset email:', error.message);
    return null;
  }
};

module.exports = {
  sendWelcomeCredentialsEmail,
  sendPasswordResetEmail
};
