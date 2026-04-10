require('dotenv').config();
const { connectDB, getSequelize } = require('./src/config/db');

(async () => {
  try {
    console.log('[FIX-CHARSET] Connecting to database...');
    await connectDB();
    
    const sequelize = getSequelize();
    
    // Force UTF-8 on all tables
    console.log('[FIX-CHARSET] Converting all tables to utf8mb4...');
    
    // ALTER tables
    await sequelize.query(`ALTER TABLE positions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('[FIX-CHARSET] ✓ positions table converted');
    
    await sequelize.query(`ALTER TABLE departments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('[FIX-CHARSET] ✓ departments table converted');
    
    await sequelize.query(`ALTER TABLE user_requests CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('[FIX-CHARSET] ✓ user_requests table converted');
    
    // Verify
    console.log('[FIX-CHARSET] Verifying table charsets...');
    const tables = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_COLLATION 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, { 
      replacements: [process.env.DB_NAME],
      type: sequelize.QueryTypes.SELECT 
    });
    
    tables.forEach(t => {
      console.log(`[FIX-CHARSET] ${t.TABLE_NAME}: ${t.TABLE_COLLATION}`);
    });
    
    console.log('[FIX-CHARSET] ✓ All tables fixed!');
    process.exit(0);
  } catch (error) {
    console.error('[FIX-CHARSET] ❌ Error:', error.message);
    process.exit(1);
  }
})();
