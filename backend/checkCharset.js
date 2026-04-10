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
    
    // Check database charset
    const dbInfo = await sequelize.query(`
      SELECT @@character_set_database, @@collation_database;
    `);
    console.log('Database charset/collation:', dbInfo[0]);
    
    // Check table charset
    const tableInfo = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, { 
      replacements: [process.env.DB_NAME],
      type: Sequelize.QueryTypes.SELECT 
    });
    console.log('\nTable collations:');
    tableInfo.forEach(t => console.log(`  ${t.TABLE_NAME}: ${t.TABLE_COLLATION}`));
    
    // Check column charset
    const colInfo = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND CHARACTER_SET_NAME IS NOT NULL
    `, { 
      replacements: [process.env.DB_NAME],
      type: Sequelize.QueryTypes.SELECT 
    });
    console.log('\nColumn charsets:');
    colInfo.forEach(c => console.log(`  ${c.TABLE_NAME}.${c.COLUMN_NAME}: ${c.CHARACTER_SET_NAME}/${c.COLLATION_NAME}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
})();
