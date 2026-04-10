const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const systemRoutes = require('./routes/systemRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const { getProfiles } = require('./controllers/requestController');
const { protect } = require('./middleware/authMiddleware');

const app = express();

// Middleware for parsing requests with UTF-8
app.use(express.json({ 
  limit: '10mb',
  strict: false,
}));
app.use(express.text({ limit: '10mb' }));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb',
  parameterLimit: 50,
}));

// Ensure UTF-8 in all responses
app.use((req, res, next) => {
  // Force response encoding
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Prevent browser from overriding
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
console.log('[CORS] Allowing origin:', corsOrigin);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/settings', settingsRoutes);

// Standalone profiles endpoint
app.get('/api/profiles', protect, getProfiles);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
