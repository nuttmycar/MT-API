const https = require('https');
const http = require('http');
const { RouterOSClient } = require('routeros-client');

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

const readValue = (item = {}, ...keys) => {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      return item[key];
    }
  }
  return '';
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['true', '1', 'yes', 'on', 'enabled'].includes(String(value || '').toLowerCase());
};

const normalizeOsVersion = (value) => {
  const raw = String(value || 'v7').trim().toLowerCase();
  if (raw === 'v6' || raw === '6' || raw.startsWith('v6.') || raw.startsWith('6.')) return 'v6';
  if (raw === 'v7' || raw === '7' || raw.startsWith('v7.') || raw.startsWith('7.')) return 'v7';
  return 'v7';
};

/**
 * RouterOS REST API Client
 * Based on: https://gist.github.com/AdroitAdorKhan/59e7691e93554c13b574fa8e1332de4a
 * Uses HTTP/HTTPS with Basic Authentication
 */
class MikroTikAPI {
  constructor(config) {
    this.host = config.ip;
    const rawPort = parseInt(config.port, 10) || 8728;
    this.rawPort = rawPort;
    this.apiPort = config.apiPort || normalizeApiPort(rawPort);
    this.port = config.restPort || normalizeRestPort(rawPort);
    this.username = config.username;
    this.password = config.password;
    this.timeout = config.timeout || 5000;
    this.osVersion = normalizeOsVersion(config.os_version);
    this.preferLegacyApi = this.osVersion === 'v6';
    this.lastTransport = this.preferLegacyApi ? 'ROS-API (preferred)' : 'REST (preferred)';
    
    // Determine protocol based on normalized REST port
    this.protocol = this.port === 443 ? 'https' : 'http';
    this.baseUrl = `${this.protocol}://${this.host}:${this.port}/rest`;
  }

  async withLegacyApi(label, callback) {
    const api = new RouterOSClient({
      host: this.host,
      user: this.username,
      password: this.password,
      port: this.apiPort,
      timeout: this.timeout,
    });

    const client = await api.connect();

    try {
      console.log(`[MikroTik-API] ${label} via ${this.host}:${this.apiPort}`);
      return await callback(client);
    } finally {
      if (client?.close) {
        await client.close().catch(() => {});
      } else if (api?.close) {
        await api.close().catch(() => {});
      }
    }
  }

  async runWithTransport(label, restAction, legacyAction) {
    if (this.preferLegacyApi) {
      this.lastTransport = 'ROS-API';
      console.log(`[MikroTik] ${label}: using RouterOS API (ROS v6 mode)`);
      return legacyAction();
    }

    try {
      const result = await restAction();
      this.lastTransport = 'REST';
      console.log(`[MikroTik] ${label}: using REST API`);
      return result;
    } catch (error) {
      this.lastTransport = 'ROS-API (fallback)';
      console.warn(`[MikroTik] ${label} REST failed, trying RouterOS API fallback: ${error.message}`);
      return legacyAction();
    }
  }

  /**
   * Test connection to MikroTik
   */
  async testConnection() {
    return this.runWithTransport(
      'Connection test',
      () => new Promise((resolve, reject) => {
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

        const client = this.protocol === 'https' ? https : http;
        const options = {
          hostname: this.host,
          port: this.port,
          path: '/rest/system/resource',
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout,
          rejectUnauthorized: false
        };

        const req = client.request(options, (res) => {
          if (res.statusCode === 200) {
            console.log(`[MikroTik] ✓ Connected to ${this.host}:${this.port} (${this.protocol})`);
            resolve(true);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });

        req.on('error', (err) => {
          console.error(`[MikroTik] ✗ Connection error: ${err.message}`);
          reject(err);
        });

        req.on('timeout', () => {
          console.error('[MikroTik] ✗ Connection timeout');
          req.destroy();
          reject(new Error('Connection timeout'));
        });

        req.end();
      }),
      () => this.withLegacyApi('Connection test', async () => true)
    );
  }

  /**
   * Make REST API request to RouterOS
   */
  async restRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      const client = this.protocol === 'https' ? https : http;
      
      const options = {
        hostname: this.host,
        port: this.port,
        path: `/rest${path}`,
        method: method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout,
        rejectUnauthorized: false
      };

      console.log(`[MikroTik-REST] ${method} ${this.protocol}://${this.host}:${this.port}/rest${path}`);

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
              if (!data || !data.trim()) {
                console.log(`[MikroTik-REST] ✓ Success (${res.statusCode})`);
                resolve({});
                return;
              }

              const parsed = JSON.parse(data);
              console.log(`[MikroTik-REST] ✓ Success (${res.statusCode})`);
              resolve(parsed);
            } else {
              console.warn(`[MikroTik-REST] Status ${res.statusCode}`);
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
        console.error(`[MikroTik-REST] Timeout`);
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async getSystemInfoViaLegacyApi() {
    return this.withLegacyApi('Get system info', async (client) => {
      const resource = await client.menu('/system resource').getOnly();
      const identity = await client.menu('/system identity').getOnly();

      const totalMemoryBytes = parseInt(readValue(resource, 'total-memory', 'totalMemory'), 10) || 0;
      const freeMemoryBytes = parseInt(readValue(resource, 'free-memory', 'freeMemory'), 10) || 0;
      const usedMemoryBytes = Math.max(totalMemoryBytes - freeMemoryBytes, 0);
      const memoryUsagePercent = totalMemoryBytes > 0
        ? Math.round((usedMemoryBytes / totalMemoryBytes) * 100)
        : null;

      const totalDiskBytes = parseInt(readValue(resource, 'total-hdd-space', 'totalHddSpace'), 10) || 0;
      const freeDiskBytes = parseInt(readValue(resource, 'free-hdd-space', 'freeHddSpace'), 10) || 0;
      const usedDiskBytes = Math.max(totalDiskBytes - freeDiskBytes, 0);
      const diskUsagePercent = totalDiskBytes > 0
        ? Math.round((usedDiskBytes / totalDiskBytes) * 100)
        : null;

      return {
        routerName: readValue(identity, 'name') || readValue(resource, 'board-name', 'boardName') || 'MikroTik RouterOS',
        uptime: readValue(resource, 'uptime') || 'N/A',
        cpu: readValue(resource, 'cpu-count', 'cpuCount') || '1',
        cpuLoad: Number(readValue(resource, 'cpu-load', 'cpuLoad')) || 0,
        freememory: this.formatBytes(freeMemoryBytes) || 'N/A',
        totalmemory: this.formatBytes(totalMemoryBytes) || 'N/A',
        usedmemory: this.formatBytes(usedMemoryBytes) || 'N/A',
        memoryUsagePercent,
        freedisk: this.formatBytes(freeDiskBytes) || 'N/A',
        totaldisk: this.formatBytes(totalDiskBytes) || 'N/A',
        diskUsagePercent,
        architecture: readValue(resource, 'architecture-name', 'architectureName', 'architecture') || 'unknown',
        platform: readValue(resource, 'platform') || 'RouterOS',
        version: readValue(resource, 'version') || 'N/A',
        os_version: this.osVersion,
        'board-name': readValue(resource, 'board-name', 'boardName') || readValue(identity, 'name') || 'MikroTik RouterOS',
        'build-time': readValue(resource, 'build-time', 'buildTime') || 'N/A',
        timestamp: new Date().toISOString(),
        host: this.host,
        connected: true,
        dataSource: 'REAL',
        transport: this.lastTransport
      };
    });
  }

  async getInterfacesViaLegacyApi() {
    return this.withLegacyApi('Get interfaces', async (client) => {
      const interfaces = await client.menu('/interface').get();

      return (Array.isArray(interfaces) ? interfaces : []).map((iface) => ({
        name: readValue(iface, 'name') || 'unknown',
        type: readValue(iface, 'type') || 'ether',
        running: normalizeBoolean(readValue(iface, 'running')),
        disabled: normalizeBoolean(readValue(iface, 'disabled')),
        speed: readValue(iface, 'link-speed', 'linkSpeed', 'speed') || 'auto',
        mtu: readValue(iface, 'mtu') || '1500',
        'mac-address': readValue(iface, 'mac-address', 'macAddress') || 'N/A',
        stats: {
          'rx-packets': (parseInt(readValue(iface, 'rx-packet', 'rxPacket'), 10) || 0).toLocaleString(),
          'tx-packets': (parseInt(readValue(iface, 'tx-packet', 'txPacket'), 10) || 0).toLocaleString(),
          'rx-bytes': this.formatBytes(parseInt(readValue(iface, 'rx-byte', 'rxByte'), 10) || 0) || '0 B',
          'tx-bytes': this.formatBytes(parseInt(readValue(iface, 'tx-byte', 'txByte'), 10) || 0) || '0 B'
        },
        dataSource: 'REAL'
      }));
    });
  }

  async getHotspotUsersViaLegacyApi() {
    return this.withLegacyApi('Get hotspot users', async (client) => {
      const users = await client.menu('/ip hotspot user').get();

      return (Array.isArray(users) ? users : []).map((user) => ({
        name: readValue(user, 'name') || 'unknown',
        profile: readValue(user, 'profile') || 'default',
        disabled: normalizeBoolean(readValue(user, 'disabled')),
        'last-login': readValue(user, 'last-seen', 'lastSeen') || 'Never',
        comment: readValue(user, 'comment') || '',
        'upload-limit': readValue(user, 'rate-limit-rx', 'rateLimitRx') || 'unlimited',
        'download-limit': readValue(user, 'rate-limit-tx', 'rateLimitTx') || 'unlimited',
        dataSource: 'REAL'
      }));
    });
  }

  async getBandwidthViaLegacyApi() {
    return this.withLegacyApi('Get bandwidth', async (client) => {
      const interfaces = await client.menu('/interface').get();

      return (Array.isArray(interfaces) ? interfaces : []).map((iface) => {
        const rxBytes = parseInt(readValue(iface, 'rx-byte', 'rxByte'), 10) || 0;
        const txBytes = parseInt(readValue(iface, 'tx-byte', 'txByte'), 10) || 0;
        const rxPackets = parseInt(readValue(iface, 'rx-packet', 'rxPacket'), 10) || 0;
        const txPackets = parseInt(readValue(iface, 'tx-packet', 'txPacket'), 10) || 0;

        return {
          interface: readValue(iface, 'name') || 'unknown',
          'rx-rate': '0 Mbps',
          'tx-rate': '0 Mbps',
          'total-rx': this.formatBytes(rxBytes),
          'total-tx': this.formatBytes(txBytes),
          'rx-packets': rxPackets.toLocaleString(),
          'tx-packets': txPackets.toLocaleString(),
          'rx-errors': parseInt(readValue(iface, 'rx-error', 'rxError'), 10) || 0,
          'tx-errors': parseInt(readValue(iface, 'tx-error', 'txError'), 10) || 0,
          'mac-address': readValue(iface, 'mac-address', 'macAddress') || 'N/A',
          running: normalizeBoolean(readValue(iface, 'running')),
          disabled: normalizeBoolean(readValue(iface, 'disabled')),
          dataSource: 'REAL'
        };
      });
    });
  }

  /**
   * Get system information
   */
  async getSystemInfo() {
    try {
      console.log(`[MikroTik-SystemInfo] Fetching from ${this.host}`);

      return await this.runWithTransport(
        'System info',
        async () => {
          const resourceResponse = await this.restRequest('/system/resource');
          const identityResponse = await this.restRequest('/system/identity');
          const resource = Array.isArray(resourceResponse) ? (resourceResponse[0] || {}) : (resourceResponse || {});
          const identity = Array.isArray(identityResponse) ? (identityResponse[0] || {}) : (identityResponse || {});

          const totalMemoryBytes = parseInt(resource['total-memory'], 10) || 0;
          const freeMemoryBytes = parseInt(resource['free-memory'], 10) || 0;
          const usedMemoryBytes = Math.max(totalMemoryBytes - freeMemoryBytes, 0);
          const memoryUsagePercent = totalMemoryBytes > 0
            ? Math.round((usedMemoryBytes / totalMemoryBytes) * 100)
            : null;

          const totalDiskBytes = parseInt(resource['total-hdd-space'], 10) || 0;
          const freeDiskBytes = parseInt(resource['free-hdd-space'], 10) || 0;
          const usedDiskBytes = Math.max(totalDiskBytes - freeDiskBytes, 0);
          const diskUsagePercent = totalDiskBytes > 0
            ? Math.round((usedDiskBytes / totalDiskBytes) * 100)
            : null;

          console.log('[MikroTik-SystemInfo] ✓ Using REAL data from RouterOS');

          return {
            routerName: identity.name || resource['board-name'] || 'MikroTik RouterOS',
            uptime: resource.uptime || 'N/A',
            cpu: resource['cpu-count'] || '1',
            cpuLoad: resource['cpu-load'] !== undefined ? Number(resource['cpu-load']) : null,
            freememory: this.formatBytes(freeMemoryBytes) || 'N/A',
            totalmemory: this.formatBytes(totalMemoryBytes) || 'N/A',
            usedmemory: this.formatBytes(usedMemoryBytes) || 'N/A',
            memoryUsagePercent,
            freedisk: this.formatBytes(freeDiskBytes) || 'N/A',
            totaldisk: this.formatBytes(totalDiskBytes) || 'N/A',
            diskUsagePercent,
            architecture: resource.architecture || 'unknown',
            platform: resource.platform || 'RouterOS',
            version: resource.version || 'N/A',
            os_version: this.osVersion,
            'board-name': resource['board-name'] || identity.name || 'MikroTik RouterOS',
            'build-time': resource['build-time'] || 'N/A',
            timestamp: new Date().toISOString(),
            host: this.host,
            connected: true,
            dataSource: 'REAL'
          };
        },
        () => this.getSystemInfoViaLegacyApi()
      );
    } catch (error) {
      console.warn(`[MikroTik-SystemInfo] Live API failed: ${error.message}`);
      return this.getMockSystemInfo();
    }
  }

  /**
   * Get network interfaces
   */
  async getInterfaces() {
    try {
      console.log(`[MikroTik-Interfaces] Fetching from ${this.host}`);

      return await this.runWithTransport(
        'Interfaces',
        async () => {
          const interfaces = await this.restRequest('/interface');

          if (!Array.isArray(interfaces) || interfaces.length === 0) {
            console.warn('[MikroTik-Interfaces] No interfaces returned');
            return this.getMockInterfaces();
          }

          console.log(`[MikroTik-Interfaces] ✓ Using REAL data - found ${interfaces.length} interfaces`);

          return interfaces.map((iface) => ({
            name: iface.name || 'unknown',
            type: iface.type || 'ether',
            running: iface.running === true || iface.running === 'true',
            disabled: iface.disabled === true || iface.disabled === 'true',
            speed: iface['link-speed'] || 'auto',
            mtu: iface.mtu || '1500',
            'mac-address': iface['mac-address'] || 'N/A',
            stats: {
              'rx-packets': iface['rx-packet']?.toLocaleString() || '0',
              'tx-packets': iface['tx-packet']?.toLocaleString() || '0',
              'rx-bytes': this.formatBytes(iface['rx-byte']) || '0',
              'tx-bytes': this.formatBytes(iface['tx-byte']) || '0'
            },
            dataSource: 'REAL'
          }));
        },
        () => this.getInterfacesViaLegacyApi()
      );
    } catch (error) {
      console.warn(`[MikroTik-Interfaces] Live API failed: ${error.message}`);
      return this.getMockInterfaces();
    }
  }

  /**
   * Get hotspot users - requires /ip/hotspot/user endpoint
   */
  async getHotspotUsers() {
    try {
      console.log(`[MikroTik-Hotspot] Fetching from ${this.host}`);

      return await this.runWithTransport(
        'Hotspot users',
        async () => {
          const users = await this.restRequest('/ip/hotspot/user');

          if (!Array.isArray(users) || users.length === 0) {
            console.warn('[MikroTik-Hotspot] No users returned');
            return this.getMockHotspotUsers();
          }

          console.log(`[MikroTik-Hotspot] ✓ Using REAL data - found ${users.length} users`);

          return users.map((user) => ({
            name: user.name || 'unknown',
            profile: user.profile || 'default',
            disabled: user.disabled === true || user.disabled === 'true',
            'last-login': user['last-seen'] || 'Never',
            comment: user.comment || '',
            'upload-limit': user['rate-limit-rx'] || 'unlimited',
            'download-limit': user['rate-limit-tx'] || 'unlimited',
            dataSource: 'REAL'
          }));
        },
        () => this.getHotspotUsersViaLegacyApi()
      );
    } catch (error) {
      console.warn(`[MikroTik-Hotspot] Live API failed: ${error.message}`);
      return this.getMockHotspotUsers();
    }
  }

  /**
   * Get bandwidth statistics
   * Instead of monitor-traffic, we use interface statistics directly
   */
  async getBandwidth() {
    try {
      console.log(`[MikroTik-Bandwidth] Fetching from ${this.host}`);

      return await this.runWithTransport(
        'Bandwidth',
        async () => {
          const interfaces = await this.restRequest('/interface');

          if (!Array.isArray(interfaces) || interfaces.length === 0) {
            console.warn('[MikroTik-Bandwidth] No interfaces found');
            return this.getMockBandwidth();
          }

          const bandwidth = [];
          for (const iface of interfaces) {
            try {
              const details = await this.restRequest(`/interface/${iface.name}`);

              if (details) {
                const rxBytes = parseInt(details['rx-byte']) || 0;
                const txBytes = parseInt(details['tx-byte']) || 0;
                const rxPackets = parseInt(details['rx-packet']) || 0;
                const txPackets = parseInt(details['tx-packet']) || 0;

                bandwidth.push({
                  interface: iface.name,
                  'rx-rate': '0 Mbps',
                  'tx-rate': '0 Mbps',
                  'total-rx': this.formatBytes(rxBytes),
                  'total-tx': this.formatBytes(txBytes),
                  'rx-packets': rxPackets.toLocaleString(),
                  'tx-packets': txPackets.toLocaleString(),
                  'rx-errors': parseInt(details['rx-error']) || 0,
                  'tx-errors': parseInt(details['tx-error']) || 0,
                  'mac-address': details['mac-address'] || 'N/A',
                  running: details.running === 'true' || details.running === true,
                  disabled: details.disabled === 'true' || details.disabled === true,
                  dataSource: 'REAL'
                });
              }
            } catch (e) {
              console.warn(`[MikroTik-Bandwidth] Failed to get stats for ${iface.name}: ${e.message}`);
            }
          }

          if (bandwidth.length > 0) {
            console.log(`[MikroTik-Bandwidth] ✓ Using REAL data from ${bandwidth.length} interfaces`);
            return bandwidth;
          }

          return this.getMockBandwidth();
        },
        () => this.getBandwidthViaLegacyApi()
      );
    } catch (error) {
      console.warn(`[MikroTik-Bandwidth] Live API failed: ${error.message}`);
      return this.getMockBandwidth();
    }
  }

  // ============ MOCK DATA FALLBACKS ============

  getMockSystemInfo() {
    console.log(`[MikroTik-SystemInfo] ⚠ Using MOCK data`);
    return {
      routerName: 'MikroTik RouterOS',
      uptime: '42 days, 3 hours, 15 minutes',
      freememory: '512 MB',
      totalmemory: '1024 MB',
      usedmemory: '512 MB',
      memoryUsagePercent: 50,
      freedisk: '768 MB',
      totaldisk: '1 GB',
      diskUsagePercent: 25,
      cpu: '4',
      cpuLoad: 18,
      architecture: 'x86',
      platform: 'RouterOS',
      version: this.osVersion === 'v6' ? '6.48.10' : '7.9',
      os_version: this.osVersion,
      'board-name': 'MikroTik RouterOS',
      'build-time': '2024-01-15 10:30:00',
      timestamp: new Date().toISOString(),
      host: this.host,
      connected: true,
      dataSource: 'MOCK (live transport unavailable)',
      transport: 'MOCK'
    };
  }

  getMockInterfaces() {
    console.log(`[MikroTik-Interfaces] ⚠ Using MOCK data`);
    return [
      {
        name: 'ether1',
        type: 'ether',
        running: true,
        disabled: false,
        speed: '1Gbps',
        mtu: '1500',
        'mac-address': '00:0C:42:31:A1:B2',
        stats: { 'rx-packets': '1,234,567', 'tx-packets': '987,654', 'rx-bytes': '256 MB', 'tx-bytes': '128 MB' },
        dataSource: 'MOCK'
      },
      {
        name: 'ether2',
        type: 'ether',
        running: false,
        disabled: false,
        speed: '1Gbps',
        mtu: '1500',
        'mac-address': '00:0C:42:31:A1:B3',
        stats: { 'rx-packets': '0', 'tx-packets': '0', 'rx-bytes': '0 B', 'tx-bytes': '0 B' },
        dataSource: 'MOCK'
      },
      {
        name: 'wlan1',
        type: 'wireless',
        running: true,
        disabled: false,
        speed: '300Mbps',
        mtu: '1500',
        'mac-address': '00:0C:42:31:A1:B4',
        stats: { 'rx-packets': '5,678,901', 'tx-packets': '4,567,890', 'rx-bytes': '512 MB', 'tx-bytes': '256 MB' },
        dataSource: 'MOCK'
      },
      {
        name: 'bridge1',
        type: 'bridge',
        running: true,
        disabled: false,
        speed: 'auto',
        mtu: '1500',
        'mac-address': '00:0C:42:31:A1:B5',
        stats: { 'rx-packets': '9,876,543', 'tx-packets': '8,765,432', 'rx-bytes': '1 GB', 'tx-bytes': '512 MB' },
        dataSource: 'MOCK'
      }
    ];
  }

  getMockHotspotUsers() {
    console.log(`[MikroTik-Hotspot] ⚠ Using MOCK data`);
    return [
      {
        name: 'user001',
        profile: 'standard',
        disabled: false,
        'last-login': new Date(Date.now() - 300000).toLocaleString('th-TH'),
        comment: 'Premium Member',
        'upload-limit': '10M',
        'download-limit': '50M',
        dataSource: 'MOCK'
      },
      {
        name: 'user002',
        profile: 'express',
        disabled: false,
        'last-login': new Date(Date.now() - 3600000).toLocaleString('th-TH'),
        comment: 'Express Package',
        'upload-limit': '5M',
        'download-limit': '25M',
        dataSource: 'MOCK'
      },
      {
        name: 'user003',
        profile: 'standard',
        disabled: true,
        'last-login': new Date(Date.now() - 86400000).toLocaleString('th-TH'),
        comment: '',
        'upload-limit': '10M',
        'download-limit': '50M',
        dataSource: 'MOCK'
      },
      {
        name: 'user004',
        profile: 'admin',
        disabled: false,
        'last-login': new Date(Date.now() - 600000).toLocaleString('th-TH'),
        comment: 'Administrator',
        'upload-limit': 'unlimited',
        'download-limit': 'unlimited',
        dataSource: 'MOCK'
      },
      {
        name: 'user005',
        profile: 'express',
        disabled: false,
        'last-login': new Date(Date.now() - 172800000).toLocaleString('th-TH'),
        comment: '',
        'upload-limit': '5M',
        'download-limit': '25M',
        dataSource: 'MOCK'
      }
    ];
  }

  getMockBandwidth() {
    console.log(`[MikroTik-Bandwidth] ⚠ Using MOCK data`);
    return [
      {
        interface: 'ether1',
        'rx-rate': this.getRandomRate(50) + ' Mbps',
        'tx-rate': this.getRandomRate(40) + ' Mbps',
        'total-rx': '256 GB',
        'total-tx': '128 GB',
        'rx-packets': '1,234,567',
        'tx-packets': '987,654',
        'rx-errors': '0',
        'tx-errors': '0',
        dataSource: 'MOCK'
      },
      {
        interface: 'wlan1',
        'rx-rate': this.getRandomRate(100) + ' Mbps',
        'tx-rate': this.getRandomRate(80) + ' Mbps',
        'total-rx': '512 GB',
        'total-tx': '256 GB',
        'rx-packets': '5,678,901',
        'tx-packets': '4,567,890',
        'rx-errors': '2',
        'tx-errors': '0',
        dataSource: 'MOCK'
      },
      {
        interface: 'bridge1',
        'rx-rate': this.getRandomRate(150) + ' Mbps',
        'tx-rate': this.getRandomRate(120) + ' Mbps',
        'total-rx': '1.2 TB',
        'total-tx': '512 GB',
        'rx-packets': '9,876,543',
        'tx-packets': '8,765,432',
        'rx-errors': '0',
        'tx-errors': '0',
        dataSource: 'MOCK'
      }
    ];
  }

  // ============ UTILITY FUNCTIONS ============

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatMbps(bits) {
    if (!bits || bits === 0) return '0 Mbps';
    const mbps = bits / 1024 / 1024;
    return Math.round(mbps * 100) / 100 + ' Mbps';
  }

  getRandomRate(max) {
    return Math.round(Math.random() * max + 5);
  }
}

module.exports = MikroTikAPI;


