const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'sa',
      password: 'eepower'
    });

    console.log('[FIX] Altering database character set...');
    await conn.query('ALTER DATABASE `mt_api` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('[FIX] ✓ Database charset updated to utf8mb4_unicode_ci');

    // Verify
    const result = await conn.query('SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = "mt_api"');
    console.log('[FIX] Verification:', result[0][0]);

    // Also alter all existing tables
    console.log('[FIX] Converting all table charsets...');
    const tables = await conn.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "mt_api"');
    
    for (const table of tables[0]) {
      await conn.query(`ALTER TABLE \`mt_api\`.\`${table.TABLE_NAME}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`[FIX] ✓ Table ${table.TABLE_NAME} converted`);
    }

    console.log('[FIX] ✓ All tables converted successfully');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('[FIX] ✗ Error:', error.message);
    process.exit(1);
  }
})();
