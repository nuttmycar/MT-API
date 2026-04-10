require('dotenv').config();
const { connectDB, getSequelize } = require('./src/config/db');

(async () => {
  try {
    console.log('[FINAL-CLEANUP] Connecting to database...');
    await connectDB();
    
    const sequelize = getSequelize();
    const Position = sequelize.models.Position;
    const Department = sequelize.models.Department;
    
    console.log('[FINAL-CLEANUP] Deleting ALL positions...');
    const deletedPos = await Position.destroy({ where: {} });
    console.log(`[FINAL-CLEANUP] ✓ Deleted ${deletedPos} positions`);
    
    console.log('[FINAL-CLEANUP] Deleting ALL departments...');
    const deletedDep = await Department.destroy({ where: {} });
    console.log(`[FINAL-CLEANUP] ✓ Deleted ${deletedDep} departments`);
    
    // Verify empty
    const positions = await Position.findAll();
    const departments = await Department.findAll();
    console.log('[FINAL-CLEANUP] Positions remaining:', positions.length);
    console.log('[FINAL-CLEANUP] Departments remaining:', departments.length);
    
    console.log('[FINAL-CLEANUP] ✓ Database is clean!');
    process.exit(0);
  } catch (error) {
    console.error('[FINAL-CLEANUP] ❌ Error:', error.message);
    process.exit(1);
  }
})();
