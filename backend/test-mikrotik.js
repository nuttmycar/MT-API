// Test RouterOS REST API connection
const https = require('https');
const tls = require('tls');

const config = {
  host: '192.168.10.1',
  port: 8729,
  path: '/rest/system/resource',
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + Buffer.from('bbapi:eepower').toString('base64')
  },
  rejectUnauthorized: false,
  minVersion: 'TLSv1',
  maxVersion: 'TLSv1.3'
};

console.log(`[TEST] Connecting to https://${config.host}:${config.port}${config.path}...`);

const req = https.request(config, (res) => {
  console.log(`[SUCCESS] Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n[DATA] System Resource:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('[RAW] Response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error(`[ERROR] ${err.message}`);
});

req.setTimeout(5000, () => {
  console.error('[TIMEOUT] Request timed out');
  req.destroy();
});

req.end();
