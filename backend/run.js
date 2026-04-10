#!/usr/bin/env node

require('dotenv').config();
const { connectDB } = require('./src/config/db');
const app = require('./src/app');

const startServer = async () => {
  try {
    console.log('[SERVER] Starting server...');
    console.log('[SERVER] NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('[SERVER] PORT:', process.env.PORT || 3000);
    
    await connectDB();
    
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] ✓ MT-API backend running on http://localhost:${PORT}`);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[SERVER] ⚠️ Port ${PORT} in use, trying ${PORT + 1}...`);
        const newPort = PORT + 1;
        server.listen(newPort, '0.0.0.0');
      } else {
        console.error('[SERVER] Server error:', err);
      }
    });
  } catch (error) {
    console.error('[SERVER] ❌ Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
