const dotenv = require('dotenv');
dotenv.config();

const { connectDB } = require('./config/db');
const { startBackupScheduler } = require('./utils/backupService');
const app = require('./app');

const startServer = async () => {
  try {
    await connectDB();
    startBackupScheduler();

    let currentPort = Number(process.env.PORT) || 3000;
    const server = app.listen(currentPort, () => {
      console.log(`MT-API backend running on http://localhost:${currentPort}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${currentPort} is in use, trying another port...`);
        currentPort += 1;
        process.env.PORT = String(currentPort);
        server.listen(currentPort);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
