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

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Root aliases for /signup and /login as requested
app.use('/', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes); // Allows direct /admin/* access with middleware
app.use('/api/employee', employeeRoutes);
app.use('/employee', employeeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'MY-BUDDY-HRMS Auth API'
  });
});

// SPA Fallback for clean frontend URLs (Express 5 compatible)
app.use((req, res) => {
  // If it's an API route that wasn't handled, return JSON 404
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
    console.log(`🚀 MY-BUDDY-HRMS Server running on http://localhost:${PORT}`);
    console.log(`📋 Auth API: http://localhost:${PORT}/api/auth`);
    console.log(`🛡️ Admin API: http://localhost:${PORT}/api/admin`);
    console.log(`👤 Employee API: http://localhost:${PORT}/api/employee`);
    console.log(`=========================================`);
  });
}

module.exports = app;
