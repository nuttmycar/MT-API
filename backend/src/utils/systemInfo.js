const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../config/db');
const MikroTikAPI = require('./mikrotikAPI');

const normalizeOsVersion = (value) => {
  const raw = String(value || 'v7').trim().toLowerCase();
  if (raw === 'v6' || raw === '6' || raw.startsWith('v6.') || raw.startsWith('6.')) return 'v6';
  if (raw === 'v7' || raw === '7' || raw.startsWith('v7.') || raw.startsWith('7.')) return 'v7';
  return 'v7';
};

const parseSizeToUnit = (value, targetUnit) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const match = String(value).trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([KMGT]?B)$/i);
  if (!match) return Number(value) || 0;

  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  const toBytes = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  const targetBytes = targetUnit === 'GB' ? toBytes.GB : toBytes.MB;
  return Math.round((amount * toBytes[unit] / targetBytes) * 100) / 100;
};

const STATS_CACHE_TTL_MS = 10000;
let statsCache = {
  value: null,
  expiresAt: 0,
};

/**
 * Get MikroTik config from DB or env
 */
const getMikrotikConfig = async () => {
  try {
    const sequelize = getSequelize();
    if (sequelize) {
      const result = await sequelize.query(
        'SELECT setting_value FROM settings WHERE setting_key = ?',
        {
          replacements: ['mikrotik_config'],
          type: QueryTypes.SELECT,
        }
      );

      if (result?.[0]?.setting_value) {
        const config = JSON.parse(result[0].setting_value);
        return {
          ip: config.ip,
          port: parseInt(config.port, 10) || 80,
          username: config.username,
          password: config.password,
          os_version: normalizeOsVersion(config.os_version || process.env.MIKROTIK_OS_VERSION),
        };
      }
    }
  } catch (error) {
    console.warn('[SystemInfo] Falling back to .env config:', error.message);
  }

  return {
    ip: process.env.MIKROTIK_HOST,
    port: parseInt(process.env.MIKROTIK_PORT, 10) || 80,
    username: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASS,
    os_version: normalizeOsVersion(process.env.MIKROTIK_OS_VERSION),
  };
};

/**
 * Create MikroTik connection
 */
const createMikrotikConnection = async () => {
  const config = await getMikrotikConfig();

  if (!config.ip || !config.username || !config.password) {
    throw new Error('MikroTik connection settings are missing');
  }

  console.log(`[SystemInfo] Connecting to MikroTik ${config.ip}:${config.port} (${config.os_version})...`);

  const api = new MikroTikAPI(config);
  await api.testConnection();
  console.log('[SystemInfo] ✓ Connected to MikroTik successfully');
  return api;
};

/**
 * Get system resource info from MikroTik
 */
const getMikrotikResourceInfo = async (client) => {
  try {
    console.log('[SystemInfo] Fetching system information from MikroTik...');

    const systemInfo = await client.getSystemInfo();

    console.log('[SystemInfo] ✓ Resource data received');

    return {
      cpuLoad: Number(systemInfo.cpuLoad) || 0,
      cpuCount: Number(systemInfo.cpu) || 1,
      freeMemory: parseSizeToUnit(systemInfo.freememory, 'MB'),
      totalMemory: parseSizeToUnit(systemInfo.totalmemory, 'MB'),
      free_hdd_space: parseSizeToUnit(systemInfo.freedisk, 'GB'),
      total_hdd_space: parseSizeToUnit(systemInfo.totaldisk, 'GB'),
      uptime: systemInfo.uptime || '0s',
      boardName: systemInfo['board-name'] || systemInfo.routerName || 'MikroTik',
      version: systemInfo.version || 'Unknown',
      architecture: systemInfo.architecture || 'Unknown',
      transport: systemInfo.transport || client.lastTransport || 'UNKNOWN',
      dataSource: systemInfo.dataSource || 'REAL',
    };
  } catch (error) {
    console.error('[SystemInfo] Error fetching resource info:', error.message);
    throw error;
  }
};

/**
 * Get process info from MikroTik
 */
const getMikrotikProcesses = async () => {
  console.log('[SystemInfo] Process list is disabled in fast REST mode');
  return [];
};

/**
 * Format MikroTik uptime string to readable format
 */
const formattedUptime = (uptimeStr) => {
  // MikroTik uptime format: "1w2d3h4m5s"
  // Parse it and convert to readable format
  const weeks = (uptimeStr.match(/(\d+)w/) || [0, 0])[1] || 0;
  const days = (uptimeStr.match(/(\d+)d/) || [0, 0])[1] || 0;
  const hours = (uptimeStr.match(/(\d+)h/) || [0, 0])[1] || 0;
  const minutes = (uptimeStr.match(/(\d+)m/) || [0, 0])[1] || 0;
  const seconds = (uptimeStr.match(/(\d+)s/) || [0, 0])[1] || 0;

  const totalDays = parseInt(weeks) * 7 + parseInt(days);
  
  return {
    formatted: `${totalDays}d ${hours}h ${minutes}m ${seconds}s`,
    raw: uptimeStr
  };
};

/**
 * Get all system information from MikroTik
 */
exports.getSystemStats = async ({ includeProcesses = false, forceRefresh = false } = {}) => {
  const now = Date.now();

  if (!forceRefresh && !includeProcesses && statsCache.value && statsCache.expiresAt > now) {
    console.log('[SystemInfo] ✓ Returning cached system stats');
    return statsCache.value;
  }

  let client;
  try {
    console.log('\n[SystemInfo] ========== FETCHING MIKROTIK DATA ==========');
    
    client = await createMikrotikConnection();

    const resourceInfo = await getMikrotikResourceInfo(client);
    const processes = includeProcesses ? await getMikrotikProcesses(client) : [];

    const memoryPercent = resourceInfo.totalMemory > 0 
      ? Math.round(((resourceInfo.totalMemory - resourceInfo.freeMemory) / resourceInfo.totalMemory) * 100)
      : 0;

    const diskPercent = resourceInfo.total_hdd_space > 0
      ? Math.round(((resourceInfo.total_hdd_space - resourceInfo.free_hdd_space) / resourceInfo.total_hdd_space) * 100)
      : 0;

    const stats = {
      timestamp: new Date().toISOString(),
      source: resourceInfo.dataSource === 'REAL' ? 'MikroTik RouterOS' : resourceInfo.dataSource,
      transport: resourceInfo.transport,
      cpu: {
        usage: resourceInfo.cpuLoad,
        cores: resourceInfo.cpuCount,
        load: 'See usage above'
      },
      ram: {
        total: resourceInfo.totalMemory,
        used: resourceInfo.totalMemory - resourceInfo.freeMemory,
        free: resourceInfo.freeMemory,
        percent: memoryPercent,
        unit: 'MB'
      },
      disk: {
        total: resourceInfo.total_hdd_space,
        used: resourceInfo.total_hdd_space - resourceInfo.free_hdd_space,
        free: resourceInfo.free_hdd_space,
        percent: diskPercent,
        unit: 'GB'
      },
      uptime: formattedUptime(resourceInfo.uptime),
      system: {
        boardName: resourceInfo.boardName,
        version: resourceInfo.version,
        architecture: resourceInfo.architecture
      },
      processes: {
        total: processes.length,
        list: processes.slice(0, 20),
        note: includeProcesses
          ? 'Loaded on demand'
          : 'Process list is skipped by default to keep the page fast.'
      }
    };

    if (!includeProcesses) {
      statsCache = {
        value: stats,
        expiresAt: Date.now() + STATS_CACHE_TTL_MS,
      };
    }

    console.log('[SystemInfo] ✓ Statistics compiled successfully');
    console.log('[SystemInfo] ================================================\n');

    if (client?.close) {
      await client.close();
    }
    return stats;
  } catch (error) {
    console.error('[SystemInfo] ✗ Error collecting stats:', error.message);
    if (client?.close) {
      try {
        await client.close();
      } catch (closeErr) {
        console.error('[SystemInfo] Error closing connection:', closeErr.message);
      }
    }
    throw error;
  }
};

/**
 * Get quick system info (CPU, RAM, Uptime only)
 */
exports.getSystemQuickInfo = async () => {
  let client;
  try {
    client = await createMikrotikConnection();

    const resourceInfo = await getMikrotikResourceInfo(client);

    const memoryPercent = resourceInfo.totalMemory > 0 
      ? Math.round(((resourceInfo.totalMemory - resourceInfo.freeMemory) / resourceInfo.totalMemory) * 100)
      : 0;

    const quickInfo = {
      timestamp: new Date().toISOString(),
      source: resourceInfo.dataSource === 'REAL' ? 'MikroTik RouterOS' : resourceInfo.dataSource,
      transport: resourceInfo.transport,
      cpu: resourceInfo.cpuLoad,
      ram: {
        total: resourceInfo.totalMemory,
        used: resourceInfo.totalMemory - resourceInfo.freeMemory,
        free: resourceInfo.freeMemory,
        percent: memoryPercent,
        unit: 'MB'
      },
      uptime: formattedUptime(resourceInfo.uptime).formatted,
      boardName: resourceInfo.boardName
    };

    if (client?.close) {
      await client.close();
    }
    return quickInfo;
  } catch (error) {
    console.error('[SystemInfo] Error in quick info:', error.message);
    if (client?.close) {
      try {
        await client.close();
      } catch (closeErr) {
        // ignore
      }
    }
    throw error;
  }
};
