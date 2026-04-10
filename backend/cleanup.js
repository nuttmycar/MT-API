require('dotenv').config();
const { connectDB, getSequelize } = require('./src/config/db');

(async () => {
  try {
    console.log('[CLEANUP] Connecting to database...');
    await connectDB();
    
    const sequelize = getSequelize();
    
    console.log('[CLEANUP] Dropping all tables...');
    await sequelize.drop({ cascade: true });
    console.log('[CLEANUP] ✓ All tables dropped');
    
    console.log('[CLEANUP] Syncing database with correct charset...');
    await sequelize.sync({ force: false });
    console.log('[CLEANUP] ✓ Database synced with correct charset');
    
    console.log('[CLEANUP] ✓ Database cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('[CLEANUP] ❌ Error:', error.message);
    process.exit(1);
  }
})();
