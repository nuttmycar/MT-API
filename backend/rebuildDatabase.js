require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    console.log('[DB-REBUILD] Connecting to MariaDB...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    });

    console.log('[DB-REBUILD] ✓ Connected');

    // Set session charset first
    console.log('[DB-REBUILD] Setting session charset to utf8mb4...');
    await connection.query(`SET NAMES utf8mb4`);
    await connection.query(`SET CHARACTER SET utf8mb4`);
    console.log('[DB-REBUILD] ✓ Session charset set');

    // Drop old database
    console.log('[DB-REBUILD] Dropping old database...');
    await connection.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\``);
    console.log('[DB-REBUILD] ✓ Database dropped');

    // Create new database with UTF-8
    console.log('[DB-REBUILD] Creating new database with utf8mb4...');
    await connection.query(`
      CREATE DATABASE \`${process.env.DB_NAME}\` 
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[DB-REBUILD] ✓ Database created');

    // Verify with explicit selection
    await connection.query(`USE \`${process.env.DB_NAME}\``);
    const [verify] = await connection.query(`
      SELECT DATABASE(), @@character_set_database, @@collation_database
    `);
    console.log('[DB-REBUILD] Verification:', verify[0]);

    await connection.end();
    
    console.log('[DB-REBUILD] ✓ Complete! Now restart backend to sync tables.');
    process.exit(0);
  } catch (error) {
    console.error('[DB-REBUILD] ❌ Error:', error.message);
    process.exit(1);
  }
})();
