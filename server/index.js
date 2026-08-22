require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// Import database (initializes & seeds)
require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const employeeRoutes = require('./routes/employee');
const profileRoutes = require('./routes/profile');
const attendanceRoutes = require('./routes/attendance');
const leavesRoutes = require('./routes/leaves');
const payrollRoutes = require('./routes/payroll');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sliding window rate limiter (6 requests per 60s per IP)
const ipRateLimits = new Map();
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 60000;

app.use((req, res, next) => {
  // Skip rate limiting on static assets or in test environment
  if (process.env.NODE_ENV === 'test' || req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path === '/' || req.path === '/favicon.ico') {
    return next();
  }

  const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const now = Date.now();
  
  let record = ipRateLimits.get(clientIp);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, startTime: now };
  } else {
    record.count++;
  }
  ipRateLimits.set(clientIp, record);

  const remaining = Math.max(0, RATE_LIMIT_MAX - record.count);
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', remaining);

  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      message: `Rate limit quota reached (6 requests / 60 seconds). Try again shortly.`
    });
  }

  next();
});

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount API Routers (Adhering to exact Prompt endpoints)
app.use('/', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leaves', leavesRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/employee', employeeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Dayflow HRMS Node.js API (Prompt 1-8 Compliant)'
  });
});

// SPA Fallback for clean frontend URLs
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `API route ${req.method} ${req.path} not found.`
    });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Dayflow HRMS Node.js Server running on http://localhost:${PORT}`);
    console.log(`📋 Auth & Signup API: http://localhost:${PORT}/signup`);
    console.log(`📸 Kiosk Attendance: http://localhost:${PORT}/api/v1/attendance/kiosk/check-in`);
    console.log(`🌴 Leaves API: http://localhost:${PORT}/api/v1/leaves`);
    console.log(`💰 Payroll API: http://localhost:${PORT}/api/v1/payroll`);
    console.log(`=========================================`);
  });
}

module.exports = app;
