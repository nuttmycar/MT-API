const http = require('http');

const restRequest = async (ip, path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from('bbapi:eepower').toString('base64');
    
    const options = {
      hostname: ip,
      port: 80,
      path: `/rest${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000,
      rejectUnauthorized: false
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

(async () => {
  try {
    console.log('Testing /rest/interface...');
    const interfaces = await restRequest('192.168.10.1', '/interface');
    console.log('Type:', Array.isArray(interfaces) ? 'Array' : typeof interfaces);
    console.log('Count:', Array.isArray(interfaces) ? interfaces.length : '1 object');
    console.log('First interface:', Array.isArray(interfaces) ? interfaces[0].name : interfaces.name);
    
    if (!Array.isArray(interfaces)) {
      console.log('⚠️ Response is not an array! Need to parse as object.');
    }
    
    console.log('\nTesting /rest/interface/monitor-traffic...');
    const iface_name = Array.isArray(interfaces) ? interfaces[0].name : interfaces.name;
    
    // Option 1: POST with JSON body
    try {
      console.log('Attempt 1: POST with JSON body');
      const traffic1 = await restRequest('192.168.10.1', '/interface/monitor-traffic', 'POST', {
        interface: iface_name,
        duration: '1s'
      });
      console.log('✓ Success with JSON body');
    } catch (e) {
      console.log('✗ Failed:', e.message);
    }
    
    // Option 2: GET with query parameters
    try {
      console.log('\nAttempt 2: GET with query parameters');
      const traffic2 = await restRequest('192.168.10.1', `/interface/monitor-traffic?interface=${iface_name}&duration=1s`, 'GET');
      console.log('✓ Success with query parameters');
    } catch (e) {
      console.log('✗ Failed:', e.message);
    }
    
    // Option 3: Try without wrapping body, just pass params
    try {
      console.log('\nAttempt 3: GET interface directly');
      const traffic3 = await restRequest('192.168.10.1', `/interface/${iface_name}`, 'GET');
      console.log('✓ Success! Data:', JSON.stringify(traffic3, null, 2).substring(0, 300));
    } catch (e) {
      console.log('✗ Failed:', e.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
