const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'sa',
      password: 'eepower',
      database: 'mt_api'
    });

    console.log('[FIX-COLS] Altering column character sets...');

    // ALTER TABLE positions
    await conn.query(`
      ALTER TABLE \`positions\` 
      MODIFY COLUMN \`name\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`description\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[FIX-COLS] ✓ Table positions columns updated');

    // ALTER TABLE departments
    await conn.query(`
      ALTER TABLE \`departments\` 
      MODIFY COLUMN \`name\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`description\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[FIX-COLS] ✓ Table departments columns updated');

    // ALTER TABLE user_requests
    await conn.query(`
      ALTER TABLE \`user_requests\` 
      MODIFY COLUMN \`fullName\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`username\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`email\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`password\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`profile\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      MODIFY COLUMN \`idCardNumber\` VARCHAR(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`phoneNumber\` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`position\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      MODIFY COLUMN \`department\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);
    console.log('[FIX-COLS] ✓ Table user_requests columns updated');

    // Verify
    console.log('[FIX-COLS] Verifying column collations...');
    const result = await conn.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'mt_api' AND COLUMN_TYPE LIKE '%char%'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    
    console.log('[FIX-COLS] Column collations:');
    result[0].forEach(col => {
      console.log(`  ${col.TABLE_NAME}.${col.COLUMN_NAME}: ${col.CHARACTER_SET_NAME} ${col.COLLATION_NAME}`);
    });

    console.log('[FIX-COLS] ✓ All columns converted successfully');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('[FIX-COLS] ✗ Error:', error.message);
    process.exit(1);
  }
})();
