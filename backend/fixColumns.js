require('dotenv').config();
const { connectDB, getSequelize } = require('./src/config/db');

(async () => {
  try {
    console.log('[FIX-COLUMNS] Connecting to database...');
    await connectDB();
    
    const sequelize = getSequelize();
    
    console.log('[FIX-COLUMNS] Converting all TEXT/VARCHAR columns to utf8mb4...');
    
    // Fix positions table columns
    await sequelize.query(`
      ALTER TABLE positions 
      MODIFY COLUMN name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN description LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[FIX-COLUMNS] ✓ positions table columns fixed');
    
    // Fix departments table columns  
    await sequelize.query(`
      ALTER TABLE departments
      MODIFY COLUMN name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN description LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[FIX-COLUMNS] ✓ departments table columns fixed');
    
    // Fix user_requests table columns
    await sequelize.query(`
      ALTER TABLE user_requests
      MODIFY COLUMN fullName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN username VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN password VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN profile VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      MODIFY COLUMN idCardNumber VARCHAR(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN phoneNumber VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN position VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN department VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN status ENUM('pending','approved') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);
    console.log('[FIX-COLUMNS] ✓ user_requests table columns fixed');
    
    console.log('[FIX-COLUMNS] ✓ All columns converted!');
    process.exit(0);
  } catch (error) {
    console.error('[FIX-COLUMNS] ❌ Error:', error.message);
    process.exit(1);
  }
})();
