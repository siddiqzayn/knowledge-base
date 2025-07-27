import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import { verifyToken } from './middlewares/auth.middleware.js';

dotenv.config();
const app = express();

// CORS configuration to allow frontend to communicate
// IMPORTANT: 'http://localhost:5173' must match your Vite frontend's port
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json()); // To parse JSON request bodies
app.use(cookieParser()); // To parse cookies (though not heavily used in this example)

// MySQL Connection Pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ Connected to MySQL database!');
    connection.release(); // Release the connection immediately
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // Exit process if DB connection fails
  });

// Routes
app.use('/api/auth', authRoutes);
// All document routes require token verification
app.use('/api/documents', verifyToken, documentRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).send('Something broke on the server!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
