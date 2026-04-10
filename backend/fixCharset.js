const { Sequelize } = require('sequelize');
require('dotenv').config();

(async () => {
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      logging: false,
    }
  );

  try {
    await sequelize.authenticate();
    
    console.log('Changing database charset to utf8mb4...');
    
    // Alter database to utf8mb4
    await sequelize.query(`ALTER DATABASE ${process.env.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✓ Database charset changed to utf8mb4');
    
    // Verify change
    const dbInfo = await sequelize.query(`
      SELECT @@character_set_database, @@collation_database;
    `);
    console.log('Verification:', dbInfo[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
})();
