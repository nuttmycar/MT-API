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

    console.log('[CLEANUP] Deleting old corrupted data...');
    await conn.query('DELETE FROM positions');
    await conn.query('DELETE FROM departments');
    await conn.query('DELETE FROM user_requests');
    
    console.log('[CLEANUP] ✓ All corrupted data removed');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('[CLEANUP] ✗ Error:', error.message);
    process.exit(1);
  }
})();
