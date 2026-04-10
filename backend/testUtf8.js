require('dotenv').config();
const { connectDB, getSequelize } = require('./src/config/db');

(async () => {
  try {
    console.log('[TEST] Connecting to database...');
    await connectDB();
    
    const sequelize = getSequelize();
    const Position = sequelize.models.Position;
    
    // Test 1: Insert Thai text
    console.log('[TEST] ✓ Creating test position with Thai text...');
    const testPosition = await Position.create({
      name: 'หัวหน้า',
      description: 'ตำแหน่งหัวหน้า'
    });
    
    console.log('[TEST] Created:', {
      id: testPosition.id,
      name: testPosition.name,
      description: testPosition.description,
      raw: JSON.stringify(testPosition)
    });
    
    // Test 2: Query back
    console.log('[TEST] ✓ Querying back from database...');
    const retrieved = await Position.findByPk(testPosition.id);
    console.log('[TEST] Retrieved:', {
      name: retrieved.name,
      description: retrieved.description,
      raw: JSON.stringify(retrieved)
    });
    
    // Test 3: Check raw SQL
    console.log('[TEST] ✓ Checking raw SQL data...');
    const rawData = await sequelize.query(
      `SELECT id, name, description FROM positions WHERE id = ?`,
      { replacements: [testPosition.id], type: sequelize.QueryTypes.SELECT }
    );
    console.log('[TEST] Raw SQL result:', rawData[0]);
    
    console.log('[TEST] ✓ UTF-8 test complete!');
    process.exit(0);
  } catch (error) {
    console.error('[TEST] ❌ Error:', error.message);
    process.exit(1);
  }
})();
