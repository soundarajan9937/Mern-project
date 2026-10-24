
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const gatePassRoutes = require('./routes/gatePassRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Trust proxy for Render / load balancers
app.set('trust proxy', 1);

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured frontend origins
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }

      return callback(
        new Error('CORS policy does not allow access from this origin.')
      );
    },
    credentials: true,
  })
);

// Request body middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smart Leaving and Visitor Entry Management System API',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/gatepasses', gatePassRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve frontend build if available
const frontendDist = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads')
    ) {
      return next();
    }

    const indexPath = path.join(frontendDist, 'index.html');

    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }

    return next();
  });
}

// Handle unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.originalUrl}`,
  });
});

// Central error handler
app.use(errorHandler);

module.exports = app;
