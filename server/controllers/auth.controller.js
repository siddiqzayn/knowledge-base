import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../server.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer'; // For sending emails
import crypto from 'crypto'; // For generating secure tokens

dotenv.config();

// Nodemailer transporter setup
// Configure this with your actual email service credentials from .env
const transporter = nodemailer.createTransport({
  service: 'gmail', // Example: 'gmail'. For other services, you might need host, port, secure options.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Check if user already exists
    const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully.', userId: result.insertId });
  } catch (err) {
    console.error('Backend register error:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find the user by email
    const [userRows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    if (userRows.length === 0) {
      console.log("Login attempt: User not found for email:", email);
      return res.status(404).json({ error: 'User not found or invalid credentials.' });
    }
    const user = userRows[0];

    // Compare provided password with hashed password in DB
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log("Login attempt: Invalid password for user:", email);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    console.log("Login successful for user:", email);
    res.json({ token });
  } catch (err) {
    console.error("Backend login error:", err);
    res.status(500).json({ error: 'Failed to log in.' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const [userRows] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (userRows.length === 0) {
      // For security, always send a generic success message even if email not found
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    const user = userRows[0];

    // Generate a secure, unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // Token valid for 1 hour

    // Store the token in the database
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    // Construct the reset URL for the frontend
    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

    // Send the email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Knowledge Base Password Reset Request',
      html: `
        <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
        <p>Please click on the following link, or paste this into your browser to complete the process:</p>
        <p><a href="${resetURL}">${resetURL}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    };

    // Only attempt to send email if EMAIL_USER and EMAIL_PASS are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.warn("Email credentials not configured in .env. Password reset email was not sent.");
    }

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Error processing forgot password request.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    // Find the token in the database and check expiry
    const [tokenRows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }
    const resetTokenRecord = tokenRows[0];

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and invalidate the token
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetTokenRecord.user_id]);
    await pool.query('DELETE FROM password_reset_tokens WHERE id = ?', [resetTokenRecord.id]);

    res.status(200).json({ message: 'Your password has been reset successfully.' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Error resetting password.' });
  }
};