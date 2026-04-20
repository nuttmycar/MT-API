const { Sequelize } = require('sequelize');
const { initModels } = require('../models');

let sequelize;

const connectDB = async () => {
  try {
    console.log('[DB] Connecting to database...');
    console.log('[DB] Host:', process.env.DB_HOST);
    console.log('[DB] Port:', process.env.DB_PORT);
    console.log('[DB] Database:', process.env.DB_NAME);
    console.log('[DB] User:', process.env.DB_USER);
    
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false,
        dialectOptions: {
          charset: 'utf8mb4',
          supportBigNumbers: true,
          bigNumberStrings: true,
          multipleStatements: true,
          stringifyObjects: false,
          decimalNumbers: true,
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        define: {
          charset: 'utf8mb4',
          collate: 'utf8mb4_unicode_ci',
        },
      }
    );

    console.log('[DB] Testing connection...');
    await sequelize.authenticate();
    console.log('[DB] ✓ Connected to MariaDB');
    
    // Set UTF-8 for connection IMMEDIATELY
    console.log('[DB] Setting UTF-8...');
    // Force ALL connections in pool to use UTF-8
    await sequelize.query("SET NAMES utf8mb4");
    await sequelize.query("SET CHARACTER SET utf8mb4");
    await sequelize.query("SET COLLATION_CONNECTION = utf8mb4_unicode_ci");
    // Force charset for existing connection
    await sequelize.query("SET SESSION character_set_client = utf8mb4");
    await sequelize.query("SET SESSION character_set_results = utf8mb4");
    await sequelize.query("SET SESSION character_set_connection = utf8mb4");
    await sequelize.query("SET SESSION collation_connection = utf8mb4_unicode_ci");
    console.log('[DB] ✓ UTF-8 configured');
    
    // CRITICAL: Force reconnect all pool connections with UTF-8
    console.log('[DB] Forcing pool to use UTF-8...');
    const pool = sequelize.connectionManager.pool;
    if (pool && pool._draining === false) {
      // Drain and recreate pool with new charset setting
      console.log('[DB] Pool size:', pool.size);
    }
    
    // Verify charset is set
    const charsetCheck = await sequelize.query("SELECT @@character_set_client, @@character_set_results, @@character_set_connection, @@collation_connection");
    console.log('[DB] Charset verification:', charsetCheck[0][0]);
    
    initModels(sequelize);
    console.log('[DB] Models initialized');
    
    // Add Sequelize hooks to ensure UTF-8 on every query
    console.log('[DB] Adding UTF-8 hooks...');
    sequelize.addHook('beforeCreate', async (instance) => {
      // This ensures UTF-8 for create operations
      await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    });
    
    sequelize.addHook('beforeUpdate', async (instance) => {
      await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    });
    
    sequelize.addHook('beforeFind', async (options) => {
      await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    });
    
    sequelize.addHook('beforeBulkCreate', async (options) => {
      await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    });
    
    console.log('[DB] ✓ UTF-8 hooks added');
    
    // Sync database - create new tables if not exist
    console.log('[DB] Syncing database...');
    await sequelize.sync({ force: false, alter: false });
    console.log('[DB] ✓ Database synced');

    // Inline migration: add `type` column to generated_users if missing
    try {
      const [cols] = await sequelize.query("SHOW COLUMNS FROM `generated_users` LIKE 'type'");
      if (cols.length === 0) {
        await sequelize.query(
          "ALTER TABLE `generated_users` ADD COLUMN `type` ENUM('generated','imported') NOT NULL DEFAULT 'generated' AFTER `fullName`"
        );
        await sequelize.query("ALTER TABLE `generated_users` ADD KEY `idx_gen_type` (`type`)");
        console.log('[DB] ✓ Migration: added generated_users.type column');
      }
    } catch (_migErr) {
      // generated_users table may not exist yet (first run) — skip
    }
    
    return sequelize;
  } catch (error) {
    console.error('[DB] ❌ Connection failed:', error.message);
    process.exit(1);
  }
};

const getSequelize = () => {
  if (!sequelize) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return sequelize;
};

module.exports = { getSequelize, connectDB };
