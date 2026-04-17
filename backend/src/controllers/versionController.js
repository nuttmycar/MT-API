// Version API Controller
const version = require('../version');
const { getSequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

exports.getVersion = async (req, res) => {
  try {
    res.json({
      success: true,
      version: version.app.version,
      name: version.app.name,
      displayName: version.app.displayName,
      releaseDate: version.app.releaseDate,
      buildNumber: version.app.buildNumber,
      description: version.app.description,
      components: version.components,
      compatibility: version.compatibility,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Version] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.getVersionHistory = async (req, res) => {
  try {
    res.json({
      success: true,
      current: version.app.version,
      history: version.versionHistory,
      supportedVersions: version.supportedVersions,
    });
  } catch (error) {
    console.error('[Version-History] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.getHealthAndVersion = async (req, res) => {
  try {
    const sequelize = getSequelize();
    
    // Check database connection
    let dbStatus = 'disconnected';
    if (sequelize) {
      try {
        await sequelize.query('SELECT 1', { type: QueryTypes.SELECT });
        dbStatus = 'connected';
      } catch (e) {
        dbStatus = 'error';
      }
    }

    res.json({
      success: true,
      status: 'ok',
      version: version.app.version,
      buildNumber: version.app.buildNumber,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        type: version.components.database.type,
        version: version.components.database.version,
      },
      api: {
        version: version.components.backend.version,
        framework: version.components.backend.framework,
      },
      nodeVersion: process.version,
    });
  } catch (error) {
    console.error('[Health-Version] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.checkCompatibility = async (req, res) => {
  try {
    const clientVersion = req.query.version || 'unknown';
    const supported = version.supportedVersions.security.some(
      v => v === clientVersion || v.startsWith(clientVersion.split('.')[0])
    );

    res.json({
      success: true,
      currentVersion: version.app.version,
      clientVersion,
      supported,
      upgradeAvailable: clientVersion !== version.app.version,
      latestVersion: version.app.version,
      message: supported 
        ? 'Your version is supported'
        : 'Please upgrade to the latest version',
    });
  } catch (error) {
    console.error('[Compatibility-Check] Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
