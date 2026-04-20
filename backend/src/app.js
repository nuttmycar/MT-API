const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const systemRoutes = require('./routes/systemRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const versionRoutes = require('./routes/versionRoutes');
const generatedUserRoutes = require('./routes/generatedUserRoutes');
const { getProfiles } = require('./controllers/requestController');
const { protect } = require('./middleware/authMiddleware');

const app = express();

// --- Rate Limiters ---
const rateLimit = (() => {
  const store = new Map();
  return (maxRequests, windowMs) => (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    const hits = (store.get(key) || []).filter(t => t > windowStart);
    hits.push(now);
    store.set(key, hits);
    if (hits.length > maxRequests) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    next();
  };
})();

const loginLimiter = rateLimit(10, 15 * 60 * 1000);      // 10 attempts per 15 min
const registerLimiter = rateLimit(5, 60 * 60 * 1000);    // 5 registrations per hour per IP
const apiLimiter = rateLimit(300, 60 * 1000);             // 300 req/min general

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

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/requests', apiLimiter, requestRoutes);
app.use('/api/generated-users', apiLimiter, generatedUserRoutes);
app.use('/api/system', apiLimiter, systemRoutes);
app.use('/api/settings', apiLimiter, settingsRoutes);
app.use('/', versionRoutes);

// Standalone profiles endpoint
app.get('/api/profiles', protect, getProfiles);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
