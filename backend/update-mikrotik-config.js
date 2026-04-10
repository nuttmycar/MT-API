const mysql = require('mysql2/promise');

const updateConfig = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'sa',
      password: 'eepower',
      database: 'mt_api'
    });

    const newConfig = {
      ip: '192.168.10.1',
      port: 80,
      username: 'bbapi',
      password: 'eepower',
      os_version: 'v7'
    };

    const configJson = JSON.stringify(newConfig);
    
    console.log('[CONFIG] Updating MikroTik configuration...');
    console.log('[CONFIG] New config:', configJson);

    const [result] = await connection.execute(
      'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
      [configJson, 'mikrotik_config']
    );

    console.log('[CONFIG] ✓ Configuration updated successfully');
    console.log('[CONFIG] Affected rows:', result.affectedRows);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
};

updateConfig();
