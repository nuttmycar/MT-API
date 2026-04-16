const http = require('http');
const https = require('https');
const { RouterOSClient } = require('routeros-client');
const { getSequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

const normalizeRestPort = (rawPort) => {
  const portNum = parseInt(rawPort, 10);
  if (portNum === 8728) return 80;
  if (portNum === 8729) return 443;
  return portNum || 80;
};

const normalizeApiPort = (rawPort) => {
  const portNum = parseInt(rawPort, 10);
  if (portNum === 80) return 8728;
  if (portNum === 443) return 8729;
  return portNum || 8728;
};

const getRequestClient = (port) => (normalizeRestPort(port) === 443 ? https : http);
const shouldUseLegacyApi = (config = {}) => String(config.os_version || 'v7').toLowerCase() === 'v6';

const readValue = (item = {}, ...keys) => {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      return item[key];
    }
  }
  return '';
};

// Get MikroTik config from database or .env
const getMikrotikConfig = async () => {
  try {
    const sequelize = getSequelize();
    if (!sequelize) return getDefaultConfig();

    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: ['mikrotik_config'],
        type: QueryTypes.SELECT
      }
    );

    if (result?.[0]?.setting_value) {
      const config = JSON.parse(result[0].setting_value);
      const rawPort = parseInt(config.port, 10) || 8728;
      return {
        ...config,
        port: rawPort,
        apiPort: normalizeApiPort(rawPort),
        restPort: normalizeRestPort(rawPort),
        os_version: config.os_version || 'v7',
      };
    }
  } catch (e) {
    console.warn('[MikroTik Config] Error reading from database, using .env');
  }

  return getDefaultConfig();
};

const getDefaultConfig = () => {
  const rawPort = parseInt(process.env.MIKROTIK_PORT, 10) || 8728;

  return {
    ip: process.env.MIKROTIK_HOST || '192.168.10.1',
    port: rawPort,
    apiPort: normalizeApiPort(rawPort),
    restPort: normalizeRestPort(rawPort),
    username: process.env.MIKROTIK_USER || 'bbapi',
    password: process.env.MIKROTIK_PASS || 'eepower',
    os_version: process.env.MIKROTIK_OS_VERSION || 'v7'
  };
};

const getRestAuth = (credentials = {}) => Buffer.from(
  `${credentials.username || process.env.MIKROTIK_USER || 'bbapi'}:${credentials.password || process.env.MIKROTIK_PASS || 'eepower'}`
).toString('base64');

const createLegacyClient = (config = {}) => new RouterOSClient({
  host: config.ip,
  user: config.username,
  password: config.password,
  port: config.apiPort || normalizeApiPort(config.port),
  timeout: config.timeout || 5000,
});

const withLegacyApi = async (config, label, callback) => {
  const api = createLegacyClient(config);
  const client = await api.connect();

  try {
    console.log(`[MikroTik-API] ${label} via ${config.ip}:${config.apiPort || normalizeApiPort(config.port)}`);
    return await callback(client);
  } finally {
    if (client?.close) {
      await client.close().catch(() => {});
    } else if (api?.close) {
      await api.close().catch(() => {});
    }
  }
};

const runWithTransport = async (config, label, restAction, legacyAction) => {
  if (shouldUseLegacyApi(config)) {
    console.log(`[MikroTik] ${label}: using RouterOS API (ROS v6 mode)`);
    return legacyAction();
  }

  try {
    const result = await restAction();
    console.log(`[MikroTik] ${label}: using REST API`);
    return result;
  } catch (error) {
    console.warn(`[MikroTik] ${label} REST failed, trying RouterOS API fallback: ${error.message}`);
    return legacyAction();
  }
};

const toLegacyPayload = (payload = {}) => {
  const mapped = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    switch (key) {
      case 'mac-address':
        mapped.macAddress = value;
        break;
      case 'to-address':
        mapped.toAddress = value;
        break;
      case 'dst-host':
        mapped.dstHost = value;
        break;
      case 'dst-port':
        mapped.dstPort = value;
        break;
      case 'shared-users':
        mapped.sharedUsers = value;
        break;
      case 'add-mac-cookie':
        mapped.addMacCookie = value;
        break;
      case 'transparent-proxy':
        mapped.transparentProxy = value;
        break;
      case 'disabled':
        mapped.disabled = normalizeBoolean(value);
        break;
      default:
        mapped[key] = value;
        break;
    }
  });

  return mapped;
};

// Alternative REST API request helper - send params in body as JSON  
const restRequestJsonBody = async (ip, port, path, method = 'POST', params = {}) => {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${process.env.MIKROTIK_USER || 'bbapi'}:${process.env.MIKROTIK_PASS || 'eepower'}`).toString('base64');
    const normalizedPort = normalizeRestPort(port);
    const protocol = normalizedPort === 443 ? 'https' : 'http';
    const client = getRequestClient(normalizedPort);

    // Send as JSON body
    const jsonBody = JSON.stringify(params);

    const options = {
      hostname: ip,
      port: normalizedPort,
      path: `/rest${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody)
      },
      timeout: 5000,
      rejectUnauthorized: false
    };

    console.log(`[MikroTik-REST] ${method} ${protocol}://${ip}:${normalizedPort}/rest${path}`);
    console.log(`[MikroTik-REST] JSON Body:`, jsonBody);

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`[MikroTik-REST] Response (${res.statusCode}): ${data.substring(0, 100)}`);
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            const parsed = JSON.parse(data);
            console.log(`[MikroTik-REST] ✓ Success (${res.statusCode})`);
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[MikroTik-REST] Error: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(jsonBody);
    req.end();
  });
};

// REST API request helper for sending parameters as query string
const restRequestWithParams = async (ip, port, path, method = 'POST', params = {}) => {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${process.env.MIKROTIK_USER || 'bbapi'}:${process.env.MIKROTIK_PASS || 'eepower'}`).toString('base64');
    const normalizedPort = normalizeRestPort(port);
    const protocol = normalizedPort === 443 ? 'https' : 'http';
    const client = getRequestClient(normalizedPort);

    // Convert params to query string format (with leading = for each param)
    const queryString = Object.entries(params)
      .map(([key, value]) => `=${key}=${encodeURIComponent(value)}`)
      .join('&');

    const fullPath = `/rest${path}?${queryString}`;

    const options = {
      hostname: ip,
      port: normalizedPort,
      path: fullPath,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`
      },
      timeout: 5000,
      rejectUnauthorized: false
    };

    console.log(`[MikroTik-REST] ${method} ${protocol}://${ip}:${normalizedPort}${fullPath}`);

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            const parsed = JSON.parse(data);
            console.log(`[MikroTik-REST] ✓ Success (${res.statusCode})`);
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[MikroTik-REST] Error: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

// REST API request helper
const restRequest = async (ip, port, path, method = 'GET', body = null, credentials = {}) => {
  return new Promise((resolve, reject) => {
    const auth = getRestAuth(credentials);
    const payload = body ? JSON.stringify(body) : null;
    const normalizedPort = normalizeRestPort(port);
    const protocol = normalizedPort === 443 ? 'https' : 'http';
    const client = getRequestClient(normalizedPort);

    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: ip,
      port: normalizedPort,
      path: `/rest${path}`,
      method,
      headers,
      timeout: 5000,
      rejectUnauthorized: false
    };

    console.log(`[MikroTik-REST] ${method} ${protocol}://${ip}:${normalizedPort}/rest${path}`);
    if (payload) {
      console.log(`[MikroTik-REST] Payload: ${payload}`);
    }

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          if (!data || !data.trim()) {
            console.log(`[MikroTik-REST] ✓ Success (${res.statusCode})`);
            resolve({});
            return;
          }

          try {
            const parsed = JSON.parse(data);
            console.log(`[MikroTik-REST] ✓ Success (${res.statusCode})`);
            resolve(parsed);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[MikroTik-REST] Error: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return ['true', '1', 'yes', 'on', 'enabled'].includes(String(value || '').toLowerCase());
};

const mapIpBinding = (item = {}) => ({
  id: readValue(item, '.id', 'id'),
  address: readValue(item, 'address'),
  macAddress: readValue(item, 'mac-address', 'macAddress'),
  toAddress: readValue(item, 'to-address', 'toAddress'),
  server: readValue(item, 'server') || 'all',
  type: readValue(item, 'type') || 'regular',
  disabled: normalizeBoolean(readValue(item, 'disabled')),
  comment: readValue(item, 'comment'),
  dataSource: 'REAL',
});

const buildIpBindingPayload = (binding = {}) => {
  const payload = {
    type: binding.type || 'regular',
    disabled: normalizeBoolean(binding.disabled) ? 'true' : 'false',
  };

  if (binding.address) payload.address = String(binding.address).trim();
  if (binding.macAddress) payload['mac-address'] = String(binding.macAddress).trim();
  if (binding.toAddress) payload['to-address'] = String(binding.toAddress).trim();
  if (binding.server && binding.server !== 'all') payload.server = String(binding.server).trim();
  if (binding.comment) payload.comment = String(binding.comment).trim();

  return payload;
};

const mapWalledGarden = (item = {}) => ({
  id: readValue(item, '.id', 'id'),
  dstHost: readValue(item, 'dst-host', 'dstHost'),
  path: readValue(item, 'path'),
  dstPort: readValue(item, 'dst-port', 'dstPort'),
  protocol: readValue(item, 'protocol') || 'any',
  server: readValue(item, 'server') || 'all',
  action: readValue(item, 'action') || 'allow',
  disabled: normalizeBoolean(readValue(item, 'disabled')),
  comment: readValue(item, 'comment'),
  dataSource: 'REAL',
});

const mapDhcpLease = (item = {}) => {
  const blocked = normalizeBoolean(readValue(item, 'blocked'));
  const disabled = normalizeBoolean(readValue(item, 'disabled'));
  const dynamic = normalizeBoolean(readValue(item, 'dynamic'));
  const rawStatus = String(readValue(item, 'status') || '').toLowerCase();
  const status = blocked
    ? 'blocked'
    : disabled
      ? 'disabled'
      : rawStatus || (dynamic ? 'bound' : 'static');

  return {
    id: readValue(item, '.id', 'id'),
    address: readValue(item, 'address'),
    activeAddress: readValue(item, 'active-address', 'activeAddress') || readValue(item, 'address'),
    macAddress: readValue(item, 'active-mac-address', 'activeMacAddress') || readValue(item, 'mac-address', 'macAddress'),
    hostName: readValue(item, 'host-name', 'hostName'),
    server: readValue(item, 'server') || '-',
    clientId: readValue(item, 'client-id', 'clientId'),
    activeClientId: readValue(item, 'active-client-id', 'activeClientId'),
    status,
    lastSeen: readValue(item, 'last-seen', 'lastSeen') || '-',
    expiresAfter: readValue(item, 'expires-after', 'expiresAfter') || (dynamic ? 'dynamic' : '-'),
    dynamic,
    blocked,
    disabled,
    comment: readValue(item, 'comment'),
    dataSource: 'REAL',
  };
};

const buildWalledGardenPayload = (rule = {}) => {
  const payload = {
    action: rule.action || 'allow',
    disabled: normalizeBoolean(rule.disabled) ? 'true' : 'false',
  };

  if (rule.dstHost) payload['dst-host'] = String(rule.dstHost).trim();
  if (rule.path) payload.path = String(rule.path).trim();
  if (rule.dstPort) payload['dst-port'] = String(rule.dstPort).trim();
  if (rule.protocol && rule.protocol !== 'any') payload.protocol = String(rule.protocol).trim();
  if (rule.server && rule.server !== 'all') payload.server = String(rule.server).trim();
  if (rule.comment) payload.comment = String(rule.comment).trim();

  return payload;
};

exports.addHotspotUser = async ({ name, password, profile, comment }) => {
  try {
    console.log(`\n[MikroTik] ========== ADD HOTSPOT USER ==========`);
    console.log(`[MikroTik] User: ${name}`);
    console.log(`[MikroTik] Profile: ${profile || 'default'}`);
    console.log(`[MikroTik] Comment: ${comment}`);

    const config = await getMikrotikConfig();
    console.log(`[MikroTik] Using config: ${config.ip}:${config.port} (${config.os_version || 'v7'})`);

    const userData = {
      name,
      password,
      profile: profile || 'default'
    };

    if (comment) {
      userData.comment = comment;
    }

    const result = await runWithTransport(
      config,
      'Add hotspot user',
      () => restRequest(config.ip, config.port, '/ip/hotspot/user', 'PUT', userData, config),
      () => withLegacyApi(config, 'Add hotspot user', async (client) => {
        const menu = client.menu('/ip hotspot user');
        return menu.add(toLegacyPayload(userData));
      })
    );

    console.log(`[MikroTik] ✓ User ${name} added successfully`);
    console.log(`[MikroTik] Result:`, result);
    console.log(`[MikroTik] ========================================\n`);
    return result;
  } catch (err) {
    console.error(`\n[MikroTik] ✗ Failed to add user ${name}`);
    console.error(`[MikroTik] Error:`, err.message);
    if (err.stack) {
      console.error(`[MikroTik] Stack:`, err.stack);
    }
    console.error(`[MikroTik] ========================================\n`);
    throw err;
  }
};

exports.removeHotspotUser = async (name) => {
  try {
    console.log(`\n[MikroTik] ========== REMOVE HOTSPOT USER ==========`);
    console.log(`[MikroTik] User: ${name}`);

    const config = await getMikrotikConfig();

    const success = await runWithTransport(
      config,
      'Remove hotspot user',
      async () => {
        const users = await restRequest(config.ip, config.port, '/ip/hotspot/user', 'GET', null, config);
        const user = Array.isArray(users) ? users.find((item) => item.name === name) : null;

        if (!user || !readValue(user, '.id', 'id')) {
          return false;
        }

        await restRequest(config.ip, config.port, `/ip/hotspot/user/${readValue(user, '.id', 'id')}`, 'DELETE', null, config);
        return true;
      },
      () => withLegacyApi(config, 'Remove hotspot user', async (client) => {
        const menu = client.menu('/ip hotspot user');
        const user = await menu.where('name', name).getOnly();

        if (!user) {
          return false;
        }

        await client.model(user).remove();
        return true;
      })
    );

    console.log(`[MikroTik] ${success ? '✓' : '⚠'} Remove result for ${name}: ${success}`);
    console.log(`[MikroTik] ========================================\n`);
    return success;
  } catch (err) {
    console.error(`\n[MikroTik] ✗ Failed to remove user ${name}`);
    console.error(`[MikroTik] Error:`, err.message);
    console.error(`[MikroTik] ========================================\n`);
    throw err;
  }
};

exports.getHotspotProfiles = async (profileName = null) => {
  try {
    const config = await getMikrotikConfig();
    const profiles = await runWithTransport(
      config,
      'Get hotspot profiles',
      () => restRequest(config.ip, config.port, '/ip/hotspot/user/profile', 'GET', null, config),
      () => withLegacyApi(config, 'Get hotspot profiles', async (client) => client.menu('/ip hotspot user profile').get())
    );

    const mappedProfiles = (Array.isArray(profiles) ? profiles : [])
      .map((profile) => {
        const addMacCookieValue = readValue(profile, 'add-mac-cookie', 'addMacCookie');
        return {
          id: readValue(profile, '.id', 'id'),
          name: readValue(profile, 'name'),
          rateLimit: readValue(profile, 'rate-limit', 'rateLimit') || 'unlimited',
          sharedUsers: readValue(profile, 'shared-users', 'sharedUsers') || 1,
          idleTimeout: readValue(profile, 'idle-timeout', 'idleTimeout') || 'none',
          addMacCookie: addMacCookieValue === '' ? true : !['false', 'no'].includes(String(addMacCookieValue).toLowerCase()),
          transparent: normalizeBoolean(readValue(profile, 'transparent-proxy', 'transparentProxy')),
        };
      })
      .filter((profile) => profile.name)
      .filter((profile) => !profileName || profile.name === profileName);

    console.log('[MikroTik] ✓ Mapped profiles:', mappedProfiles);
    return mappedProfiles;
  } catch (err) {
    console.warn('[MikroTik] Failed to fetch profiles, using fallback:', err.message);
    return [
      { id: '*1', name: 'default', rateLimit: '10M/10M', sharedUsers: 1 },
      { id: '*2', name: 'admin', rateLimit: '50M/50M', sharedUsers: 1 },
      { id: '*3', name: 'user', rateLimit: '10M/10M', sharedUsers: 1 }
    ].filter((profile) => !profileName || profile.name === profileName);
  }
};

exports.getHotspotUsers = async () => {
  try {
    const config = await getMikrotikConfig();
    const users = await runWithTransport(
      config,
      'Get hotspot users',
      () => restRequest(config.ip, config.port, '/ip/hotspot/user', 'GET', null, config),
      () => withLegacyApi(config, 'Get hotspot users', async (client) => client.menu('/ip hotspot user').get())
    );

    const mappedUsers = (Array.isArray(users) ? users : []).map((user) => ({
      id: readValue(user, '.id', 'id'),
      name: readValue(user, 'name'),
      profile: readValue(user, 'profile') || 'default',
      disabled: normalizeBoolean(readValue(user, 'disabled')),
      comment: readValue(user, 'comment') || '',
      'last-login': readValue(user, 'last-seen', 'lastSeen') || 'Never',
      'upload-limit': readValue(user, 'rate-limit-rx', 'rateLimitRx') || 'unlimited',
      'download-limit': readValue(user, 'rate-limit-tx', 'rateLimitTx') || 'unlimited',
      dataSource: 'REAL',
    }));

    console.log('[MikroTik] ✓ Mapped hotspot users:', mappedUsers);
    return mappedUsers;
  } catch (err) {
    console.warn('[MikroTik] Failed to fetch hotspot users:', err.message);
    return [];
  }
};

exports.getHotspotServers = async () => {
  try {
    const config = await getMikrotikConfig();
    const servers = await runWithTransport(
      config,
      'Get hotspot servers',
      () => restRequest(config.ip, config.port, '/ip/hotspot', 'GET', null, config),
      () => withLegacyApi(config, 'Get hotspot servers', async (client) => client.menu('/ip hotspot').get())
    );

    const mappedServers = (Array.isArray(servers) ? servers : [])
      .map((server) => ({
        id: readValue(server, '.id', 'id') || readValue(server, 'name'),
        name: readValue(server, 'name') || 'unknown',
        interface: readValue(server, 'interface'),
        profile: readValue(server, 'profile'),
        addressesPerMac: readValue(server, 'addresses-per-mac', 'addressesPerMac'),
        disabled: normalizeBoolean(readValue(server, 'disabled')),
        dataSource: 'REAL',
      }))
      .filter((server) => server.name && server.name !== 'unknown');

    console.log('[MikroTik] ✓ Mapped hotspot servers:', mappedServers);
    return mappedServers;
  } catch (err) {
    console.warn('[MikroTik] Failed to fetch hotspot servers:', err.message);
    return [];
  }
};

exports.getDhcpLeases = async () => {
  try {
    console.log('[MikroTik] Fetching DHCP leases...');
    const config = await getMikrotikConfig();
    const leases = await runWithTransport(
      config,
      'Get DHCP leases',
      () => restRequest(config.ip, config.port, '/ip/dhcp-server/lease', 'GET', null, config),
      () => withLegacyApi(config, 'Get DHCP leases', async (client) => client.menu('/ip dhcp-server lease').get())
    );

    return (Array.isArray(leases) ? leases : []).map(mapDhcpLease);
  } catch (err) {
    console.warn('[MikroTik] Failed to fetch DHCP leases:', err.message);
    return [];
  }
};

exports.disableHotspotUser = async (name) => {
  try {
    console.log(`[MikroTik] Disabling user: ${name}`);
    const config = await getMikrotikConfig();

    return await runWithTransport(
      config,
      'Disable hotspot user',
      async () => {
        const users = await restRequest(config.ip, config.port, '/ip/hotspot/user', 'GET', null, config);
        const user = Array.isArray(users) ? users.find((item) => item.name === name) : null;

        if (!user || !readValue(user, '.id', 'id')) {
          return false;
        }

        await restRequest(config.ip, config.port, `/ip/hotspot/user/${readValue(user, '.id', 'id')}`, 'PATCH', { disabled: 'true' }, config);
        return true;
      },
      () => withLegacyApi(config, 'Disable hotspot user', async (client) => {
        const menu = client.menu('/ip hotspot user');
        const user = await menu.where('name', name).getOnly();

        if (!user) {
          return false;
        }

        await client.model(user).update({ disabled: true });
        return true;
      })
    );
  } catch (err) {
    console.error(`[MikroTik] Failed to disable user ${name}:`, err.message);
    throw err;
  }
};

exports.enableHotspotUser = async (name) => {
  try {
    console.log(`[MikroTik] Enabling user: ${name}`);
    const config = await getMikrotikConfig();

    return await runWithTransport(
      config,
      'Enable hotspot user',
      async () => {
        const users = await restRequest(config.ip, config.port, '/ip/hotspot/user', 'GET', null, config);
        const user = Array.isArray(users) ? users.find((item) => item.name === name) : null;

        if (!user || !readValue(user, '.id', 'id')) {
          return false;
        }

        await restRequest(config.ip, config.port, `/ip/hotspot/user/${readValue(user, '.id', 'id')}`, 'PATCH', { disabled: 'false' }, config);
        return true;
      },
      () => withLegacyApi(config, 'Enable hotspot user', async (client) => {
        const menu = client.menu('/ip hotspot user');
        const user = await menu.where('name', name).getOnly();

        if (!user) {
          return false;
        }

        await client.model(user).update({ disabled: false });
        return true;
      })
    );
  } catch (err) {
    console.error(`[MikroTik] Failed to enable user ${name}:`, err.message);
    throw err;
  }
};

exports.getIpBindings = async () => {
  try {
    console.log('[MikroTik] Fetching hotspot IP bindings...');
    const config = await getMikrotikConfig();
    const bindings = await runWithTransport(
      config,
      'Get IP bindings',
      () => restRequest(config.ip, config.port, '/ip/hotspot/ip-binding', 'GET', null, config),
      () => withLegacyApi(config, 'Get IP bindings', async (client) => client.menu('/ip hotspot ip-binding').get())
    );

    return (Array.isArray(bindings) ? bindings : []).map(mapIpBinding);
  } catch (err) {
    console.warn('[MikroTik] Failed to fetch IP bindings:', err.message);
    return [];
  }
};

exports.addIpBinding = async (binding) => {
  const config = await getMikrotikConfig();
  const payload = buildIpBindingPayload(binding);

  if (!payload.address && !payload['mac-address']) {
    throw new Error('Address หรือ MAC Address ต้องมีอย่างน้อย 1 ค่า');
  }

  await runWithTransport(
    config,
    'Add IP binding',
    () => restRequest(config.ip, config.port, '/ip/hotspot/ip-binding', 'PUT', payload, config),
    () => withLegacyApi(config, 'Add IP binding', async (client) => {
      const menu = client.menu('/ip hotspot ip-binding');
      return menu.add(toLegacyPayload(payload));
    })
  );

  const bindings = await exports.getIpBindings();
  return bindings.find((item) => (
    (payload.address && item.address === payload.address)
    || (payload['mac-address'] && String(item.macAddress || '').toLowerCase() === String(payload['mac-address']).toLowerCase())
  )) || payload;
};

exports.updateIpBinding = async (id, binding) => {
  const config = await getMikrotikConfig();
  const payload = buildIpBindingPayload(binding);

  if (!payload.address && !payload['mac-address']) {
    throw new Error('Address หรือ MAC Address ต้องมีอย่างน้อย 1 ค่า');
  }

  await runWithTransport(
    config,
    'Update IP binding',
    () => restRequest(config.ip, config.port, `/ip/hotspot/ip-binding/${id}`, 'PATCH', payload, config),
    () => withLegacyApi(config, 'Update IP binding', async (client) => {
      const menu = client.menu('/ip hotspot ip-binding');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        throw new Error('IP Binding not found');
      }

      await client.model(item).update(toLegacyPayload(payload));
      return true;
    })
  );

  const bindings = await exports.getIpBindings();
  return bindings.find((item) => item.id === id) || { id, ...binding };
};

exports.disableIpBinding = async (id) => {
  const config = await getMikrotikConfig();
  await runWithTransport(
    config,
    'Disable IP binding',
    () => restRequest(config.ip, config.port, `/ip/hotspot/ip-binding/${id}`, 'PATCH', { disabled: 'true' }, config),
    () => withLegacyApi(config, 'Disable IP binding', async (client) => {
      const menu = client.menu('/ip hotspot ip-binding');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        return false;
      }

      await client.model(item).update({ disabled: true });
      return true;
    })
  );
  return true;
};

exports.enableIpBinding = async (id) => {
  const config = await getMikrotikConfig();
  await runWithTransport(
    config,
    'Enable IP binding',
    () => restRequest(config.ip, config.port, `/ip/hotspot/ip-binding/${id}`, 'PATCH', { disabled: 'false' }, config),
    () => withLegacyApi(config, 'Enable IP binding', async (client) => {
      const menu = client.menu('/ip hotspot ip-binding');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        return false;
      }

      await client.model(item).update({ disabled: false });
      return true;
    })
  );
  return true;
};

exports.removeIpBinding = async (id) => {
  const config = await getMikrotikConfig();
  await runWithTransport(
    config,
    'Remove IP binding',
    () => restRequest(config.ip, config.port, `/ip/hotspot/ip-binding/${id}`, 'DELETE', null, config),
    () => withLegacyApi(config, 'Remove IP binding', async (client) => {
      const menu = client.menu('/ip hotspot ip-binding');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        return false;
      }

      await client.model(item).remove();
      return true;
    })
  );
  return true;
};

exports.getWalledGardens = async () => {
  try {
    console.log('[MikroTik] Fetching hotspot walled garden entries...');
    const config = await getMikrotikConfig();
    const rules = await runWithTransport(
      config,
      'Get Walled Garden',
      () => restRequest(config.ip, config.port, '/ip/hotspot/walled-garden', 'GET', null, config),
      () => withLegacyApi(config, 'Get Walled Garden', async (client) => client.menu('/ip hotspot walled-garden').get())
    );

    return (Array.isArray(rules) ? rules : []).map(mapWalledGarden);
  } catch (err) {
    console.warn('[MikroTik] Failed to fetch Walled Garden entries:', err.message);
    return [];
  }
};

exports.addWalledGarden = async (rule) => {
  const config = await getMikrotikConfig();
  const payload = buildWalledGardenPayload(rule);

  if (!payload['dst-host'] && !payload.path && !payload['dst-port']) {
    throw new Error('ต้องระบุ dst-host, path หรือ dst-port อย่างน้อย 1 ค่า');
  }

  await runWithTransport(
    config,
    'Add Walled Garden',
    () => restRequest(config.ip, config.port, '/ip/hotspot/walled-garden', 'PUT', payload, config),
    () => withLegacyApi(config, 'Add Walled Garden', async (client) => {
      const menu = client.menu('/ip hotspot walled-garden');
      return menu.add(toLegacyPayload(payload));
    })
  );

  const rules = await exports.getWalledGardens();
  return rules.find((item) => (
    (payload['dst-host'] && item.dstHost === payload['dst-host'])
    || (payload.path && item.path === payload.path)
    || (payload.comment && item.comment === payload.comment)
  )) || payload;
};

exports.updateWalledGarden = async (id, rule) => {
  const config = await getMikrotikConfig();
  const payload = buildWalledGardenPayload(rule);

  if (!payload['dst-host'] && !payload.path && !payload['dst-port']) {
    throw new Error('ต้องระบุ dst-host, path หรือ dst-port อย่างน้อย 1 ค่า');
  }

  await runWithTransport(
    config,
    'Update Walled Garden',
    () => restRequest(config.ip, config.port, `/ip/hotspot/walled-garden/${id}`, 'PATCH', payload, config),
    () => withLegacyApi(config, 'Update Walled Garden', async (client) => {
      const menu = client.menu('/ip hotspot walled-garden');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        throw new Error('Walled Garden entry not found');
      }

      await client.model(item).update(toLegacyPayload(payload));
      return true;
    })
  );

  const rules = await exports.getWalledGardens();
  return rules.find((item) => item.id === id) || { id, ...rule };
};

exports.disableWalledGarden = async (id) => {
  const config = await getMikrotikConfig();
  await runWithTransport(
    config,
    'Disable Walled Garden',
    () => restRequest(config.ip, config.port, `/ip/hotspot/walled-garden/${id}`, 'PATCH', { disabled: 'true' }, config),
    () => withLegacyApi(config, 'Disable Walled Garden', async (client) => {
      const menu = client.menu('/ip hotspot walled-garden');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        return false;
      }

      await client.model(item).update({ disabled: true });
      return true;
    })
  );
  return true;
};

exports.enableWalledGarden = async (id) => {
  const config = await getMikrotikConfig();
  await runWithTransport(
    config,
    'Enable Walled Garden',
    () => restRequest(config.ip, config.port, `/ip/hotspot/walled-garden/${id}`, 'PATCH', { disabled: 'false' }, config),
    () => withLegacyApi(config, 'Enable Walled Garden', async (client) => {
      const menu = client.menu('/ip hotspot walled-garden');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        return false;
      }

      await client.model(item).update({ disabled: false });
      return true;
    })
  );
  return true;
};

exports.removeWalledGarden = async (id) => {
  const config = await getMikrotikConfig();
  await runWithTransport(
    config,
    'Remove Walled Garden',
    () => restRequest(config.ip, config.port, `/ip/hotspot/walled-garden/${id}`, 'DELETE', null, config),
    () => withLegacyApi(config, 'Remove Walled Garden', async (client) => {
      const menu = client.menu('/ip hotspot walled-garden');
      const item = await menu.where('id', id).getOnly();

      if (!item) {
        return false;
      }

      await client.model(item).remove();
      return true;
    })
  );
  return true;
};
