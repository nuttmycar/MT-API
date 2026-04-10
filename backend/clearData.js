require('dotenv').config();
const { connectDB, getSequelize } = require('./src/config/db');

(async () => {
  try {
    console.log('[CLEANUP] Connecting to database...');
    await connectDB();
    
    const sequelize = getSequelize();
    const Position = sequelize.models.Position;
    const Department = sequelize.models.Department;
    
    console.log('[CLEANUP] Deleting all positions...');
    await Position.destroy({ where: {} });
    console.log('[CLEANUP] ✓ All positions deleted');
    
    console.log('[CLEANUP] Deleting all departments...');
    await Department.destroy({ where: {} });
    console.log('[CLEANUP] ✓ All departments deleted');
    
    console.log('[CLEANUP] ✓ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('[CLEANUP] ❌ Error:', error.message);
    process.exit(1);
  }
})();
