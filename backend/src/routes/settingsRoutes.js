const express = require('express');
const { Sequelize, QueryTypes } = require('sequelize');
const { protect, requireRole, requireActionAccess } = require('../middleware/authMiddleware');
const { auditAction } = require('../middleware/auditMiddleware');
const { getSequelize } = require('../config/db');
const MikroTikAPI = require('../utils/mikrotikAPI');
const {
  disableHotspotUser,
  enableHotspotUser,
  removeHotspotUser,
  getHotspotServers,
  getIpBindings,
  addIpBinding,
  updateIpBinding,
  disableIpBinding,
  enableIpBinding,
  removeIpBinding,
  getWalledGardens,
  addWalledGarden,
  updateWalledGarden,
  disableWalledGarden,
  enableWalledGarden,
  removeWalledGarden,
} = require('../utils/mikrotik');
const { getAuditLog } = require('../models/AuditLog');
const { buildBackupPayload, writeAutoBackupFile, getBackupSchedulerStatus } = require('../utils/backupService');
const {
  getAlertConfig,
  saveAlertConfig,
  sendConfiguredAlert,
} = require('../utils/alertService');
const {
  getAccessControlOverview,
  saveRoleDefinitions,
  addManagedUser,
  updateManagedUser,
  deleteManagedUser,
} = require('../utils/accessControl');

const router = express.Router();

const DEFAULT_APP_BRANDING = {
  appName: 'MT-API',
  appSubtitle: 'MikroTik Hotspot Management System',
  browserTitle: 'MT API Dashboard',
  dashboardTitle: 'MT-API Dashboard',
  dashboardSubtitle: 'ระบบจัดการ MikroTik Hotspot พร้อมรายงานและงานอัตโนมัติ',
  footerText: '© 2026 MT-API — B&B Computer Service -- Dream Team Network Solution',
  logoUrl: '',
  faviconUrl: '',
};

const DEFAULT_REGISTRATION_CONSENT = {
  enabled: true,
  title: 'เงื่อนไขการใช้งานระบบเครือข่ายและการคุ้มครองข้อมูลส่วนบุคคล',
  content: [
    '1) ผู้ขอใช้งานยินยอมปฏิบัติตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ และข้อกำหนดของหน่วยงาน',
    '2) ระบบอาจมีการบันทึกข้อมูลการใช้งาน (Log) เพื่อความมั่นคงปลอดภัย การตรวจสอบย้อนหลัง และการปฏิบัติตามกฎหมาย',
    '3) ข้อมูลส่วนบุคคลที่เก็บจะถูกใช้เพื่อการยืนยันตัวตน การอนุมัติสิทธิ์ใช้งาน และการดูแลระบบเท่านั้น',
    '4) ห้ามนำระบบไปใช้ในทางที่ผิดกฎหมาย กระทบต่อความมั่นคง หรือรบกวนผู้ใช้งานอื่น',
    '5) ผู้ใช้งานควรเก็บรักษาชื่อผู้ใช้และรหัสผ่านเป็นความลับ และแจ้งผู้ดูแลเมื่อพบเหตุผิดปกติ',
  ].join('\n'),
  checkboxLabel: 'ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขการใช้งาน รวมถึงการเก็บและใช้ข้อมูลส่วนบุคคลตามที่กำหนด',
  requireAccuracyConfirmation: true,
  accuracyLabel: 'ข้าพเจ้ารับรองว่าข้อมูลที่กรอกเป็นจริงและยินยอมให้ตรวจสอบเพื่ออนุมัติสิทธิ์ใช้งาน',
};

const getAppBrandingConfig = async () => {
  const sequelize = getSequelize();
  const result = await sequelize.query(
    'SELECT setting_value FROM settings WHERE setting_key = ?',
    {
      replacements: ['app_branding'],
      type: QueryTypes.SELECT,
    }
  );

  if (!result?.[0]?.setting_value) {
    return DEFAULT_APP_BRANDING;
  }

  try {
    return {
      ...DEFAULT_APP_BRANDING,
      ...JSON.parse(result[0].setting_value),
    };
  } catch (error) {
    console.warn('[Settings-Branding] Invalid JSON, using defaults');
    return DEFAULT_APP_BRANDING;
  }
};

const getRegistrationConsentConfig = async () => {
  const sequelize = getSequelize();
  const result = await sequelize.query(
    'SELECT setting_value FROM settings WHERE setting_key = ?',
    {
      replacements: ['registration_consent'],
      type: QueryTypes.SELECT,
    }
  );

  if (!result?.[0]?.setting_value) {
    return DEFAULT_REGISTRATION_CONSENT;
  }

  try {
    return {
      ...DEFAULT_REGISTRATION_CONSENT,
      ...JSON.parse(result[0].setting_value),
    };
  } catch (error) {
    console.warn('[Settings-Consent] Invalid JSON, using defaults');
    return DEFAULT_REGISTRATION_CONSENT;
  }
};

// Helper: Get MikroTik config (from database or .env)
const getMikrotikConfig = async () => {
  try {
    const sequelize = getSequelize();
    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: ['mikrotik_config'],
        type: QueryTypes.SELECT
      }
    );
    
    // Try database first
    if (result?.[0]?.setting_value) {
      try {
        const config = JSON.parse(result[0].setting_value);
        // Ensure os_version exists (default v7)
        if (!config.os_version) {
          config.os_version = 'v7';
        }
        return config;
      } catch (e) {
        console.warn('[MikroTik] Error parsing database config, falling back to .env');
      }
    }
    
    // Fallback to .env
    return {
      ip: process.env.MIKROTIK_HOST,
      port: parseInt(process.env.MIKROTIK_PORT) || 8728,
      username: process.env.MIKROTIK_USER,
      password: process.env.MIKROTIK_PASS,
      os_version: 'v7'
    };
  } catch (error) {
    console.error('[MikroTik] Error getting config:', error);
    // Final fallback to .env
    return {
      ip: process.env.MIKROTIK_HOST,
      port: parseInt(process.env.MIKROTIK_PORT) || 8728,
      username: process.env.MIKROTIK_USER,
      password: process.env.MIKROTIK_PASS,
      os_version: 'v7'
    };
  }
};

const buildMikrotikDiagnostics = (config = {}, activeTransport = 'UNKNOWN') => {
  const rawPort = parseInt(config.port, 10) || 8728;
  const apiPort = rawPort === 80 ? 8728 : rawPort === 443 ? 8729 : rawPort;
  const restPort = rawPort === 8728 ? 80 : rawPort === 8729 ? 443 : rawPort;

  return {
    osVersion: config.os_version || 'v7',
    preferredTransport: (config.os_version || 'v7') === 'v6' ? 'ROS-API' : 'REST',
    activeTransport,
    apiPort,
    restPort,
    host: config.ip || '',
  };
};

const getDatabaseConfig = async () => {
  const fallback = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || '',
    username: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    dialect: 'mariadb',
  };

  try {
    const sequelize = getSequelize();
    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: ['database_config'],
        type: QueryTypes.SELECT,
      }
    );

    if (result?.[0]?.setting_value) {
      const saved = JSON.parse(result[0].setting_value);
      return { ...fallback, ...saved };
    }
  } catch (error) {
    console.error('[Database] Error getting config:', error.message);
  }

  return fallback;
};

// Get models from sequelize instance
const getModels = () => {
  try {
    const sequelize = getSequelize();
    return sequelize.models;
  } catch (error) {
    throw new Error('Database not initialized');
  }
};

// ===== POSITIONS =====

// Get all positions (PUBLIC - no auth required for registration)
router.get('/positions/public', async (req, res) => {
  try {
    const models = getModels();
    const positions = await models.Position.findAll({
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'description'],
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(positions);
  } catch (error) {
    console.error('[Settings] Error fetching public positions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all positions (PROTECTED - admin only)
router.get('/positions', protect, async (req, res) => {
  try {
    const models = getModels();
    const positions = await models.Position.findAll({
      order: [['createdAt', 'DESC']],
    });
    
    console.log('[Settings] Fetched positions count:', positions.length);
    positions.forEach((p, i) => {
      console.log(`[Settings] Position ${i}:`, {
        id: p.id,
        name: p.name,
        nameBytes: Buffer.from(p.name, 'utf8').toString('hex'),
        description: p.description,
      });
    });
    
    // Ensure response is UTF-8
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(positions);
  } catch (error) {
    console.error('[Settings] Error fetching positions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create position
router.post('/positions', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_POSITION_CREATE', entityType: 'position' }), async (req, res) => {
  try {
    let { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Position name is required' });
    }

    // ==== DEBUGGING: STEP 1 - REQUEST FROM FRONTEND ====
    console.log('\n[DEBUG] ============ POSITION CREATE REQUEST ============');
    console.log('[DEBUG] Step 1: Data from Frontend');
    console.log('[DEBUG]   name string:', name);
    console.log('[DEBUG]   name hex:', Buffer.from(name, 'utf8').toString('hex'));
    console.log('[DEBUG]   name length:', name.length);
    console.log('[DEBUG]   name char codes:', [...name].map(c => c.charCodeAt(0).toString(16)).join(' '));

    // Force UTF-8 encoding on input
    if (name.includes('\ufffd') || /[\u0e00-\u0e7f]/.test(name) === false) {
      // Assume it came in as Latin-1, convert to UTF-8
      const recovered = Buffer.from(name, 'latin1').toString('utf8');
      console.log('[DEBUG] Step 1b: Recovered from latin1:', recovered);
      name = recovered;
    }

    const models = getModels();
    
    // ==== DEBUGGING: STEP 2 - BEFORE DATABASE INSERT ====
    console.log('[DEBUG] Step 2: Before saving to database');
    console.log('[DEBUG]   name:', name);
    console.log('[DEBUG]   name hex:', Buffer.from(name, 'utf8').toString('hex'));
    
    const position = await models.Position.create({
      name: name,
      description: description || '',
    });

    // ==== DEBUGGING: STEP 3 - AFTER DATABASE INSERT ====
    console.log('[DEBUG] Step 3: After saving to database');
    console.log('[DEBUG]   id:', position.id);
    console.log('[DEBUG]   name:', position.name);
    console.log('[DEBUG]   name hex:', Buffer.from(position.name, 'utf8').toString('hex'));
    
    // ==== DEBUGGING: STEP 4 - VERIFY FROM DATABASE ====
    const freshRead = await models.Position.findByPk(position.id);
    console.log('[DEBUG] Step 4: Fresh read from database');
    console.log('[DEBUG]   name:', freshRead.name);
    console.log('[DEBUG]   name hex:', Buffer.from(freshRead.name, 'utf8').toString('hex'));
    console.log('[DEBUG] ====================================\n');

    res.status(201).json(position);
  } catch (error) {
    console.error('[Settings] Error creating position:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Position already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update position
router.put('/positions/:id', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_POSITION_UPDATE', entityType: 'position' }), async (req, res) => {
  try {
    let { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Position name is required' });
    }

    if (name.includes('\ufffd') || /[\u0e00-\u0e7f]/.test(name) === false) {
      const recovered = Buffer.from(name, 'latin1').toString('utf8');
      if (recovered) {
        name = recovered;
      }
    }

    const models = getModels();
    const position = await models.Position.findByPk(req.params.id);

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    await position.update({
      name,
      description: description || '',
    });

    res.json(position);
  } catch (error) {
    console.error('[Settings] Error updating position:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Position already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete position
router.delete('/positions/:id', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_POSITION_DELETE', entityType: 'position' }), async (req, res) => {
  try {
    const models = getModels();
    const position = await models.Position.findByPk(req.params.id);
    
    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    await position.destroy();
    res.json({ message: 'Position deleted' });
  } catch (error) {
    console.error('[Settings] Error deleting position:', error);
    res.status(500).json({ message: error.message });
  }
});

// ===== DEPARTMENTS =====

// Get all departments (PUBLIC - no auth required for registration)
router.get('/departments/public', async (req, res) => {
  try {
    const models = getModels();
    const departments = await models.Department.findAll({
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'description'],
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(departments);
  } catch (error) {
    console.error('[Settings] Error fetching public departments:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all departments (PROTECTED - admin only)
router.get('/departments', protect, async (req, res) => {
  try {
    const models = getModels();
    const departments = await models.Department.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(departments);
  } catch (error) {
    console.error('[Settings] Error fetching departments:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create department
router.post('/departments', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_DEPARTMENT_CREATE', entityType: 'department' }), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const models = getModels();
    const department = await models.Department.create({
      name,
      description: description || '',
    });

    res.status(201).json(department);
  } catch (error) {
    console.error('[Settings] Error creating department:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Department already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update department
router.put('/departments/:id', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_DEPARTMENT_UPDATE', entityType: 'department' }), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const models = getModels();
    const department = await models.Department.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await department.update({
      name,
      description: description || '',
    });

    res.json(department);
  } catch (error) {
    console.error('[Settings] Error updating department:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Department already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete department
router.delete('/departments/:id', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_DEPARTMENT_DELETE', entityType: 'department' }), async (req, res) => {
  try {
    const models = getModels();
    const department = await models.Department.findByPk(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await department.destroy();
    res.json({ message: 'Department deleted' });
  } catch (error) {
    console.error('[Settings] Error deleting department:', error);
    res.status(500).json({ message: error.message });
  }
});
// ===== REGISTRATION CODE =====

// Get registration code (PUBLIC - for registration form)
router.get('/registration-code/public', async (req, res) => {
  try {
    const { getSequelize } = require('../config/db');
    const sequelize = getSequelize();
    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: ['registration_code'],
        type: QueryTypes.SELECT
      }
    );
    const code = result?.[0]?.setting_value || null;
    
    console.log('[Settings-RegCode-Public] Code exists:', !!code);
    res.json({ codeRequired: !!code });
  } catch (error) {
    console.error('[Settings-RegCode-Public] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get registration code (ADMIN)
router.get('/registration-code', protect, async (req, res) => {
  try {
    const { getSequelize } = require('../config/db');
    const sequelize = getSequelize();
    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: ['registration_code'],
        type: QueryTypes.SELECT
      }
    );
    const code = result?.[0]?.setting_value || null;
    
    console.log('[Settings-RegCode-Admin] Fetched code:', code);
    res.json({ code });
  } catch (error) {
    console.error('[Settings-RegCode-Admin] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Set registration code (ADMIN)
router.post('/registration-code', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_REGISTRATION_CODE_UPDATE', entityType: 'setting' }), async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }
    
    // Validate: must be 5 digits
    if (!/^\d{5}$/.test(code)) {
      return res.status(400).json({ message: 'Code must be exactly 5 digits' });
    }
    
    const { getSequelize } = require('../config/db');
    const sequelize = getSequelize();
    
    console.log('[Settings-RegCode] Attempting to save code:', code);
    
    await sequelize.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      {
        replacements: ['registration_code', code, code],
        type: QueryTypes.INSERT
      }
    );
    
    console.log('[Settings-RegCode] ✓ Code saved to database:', code);
    res.json({ message: 'Registration code updated', code });
  } catch (error) {
    console.error('[Settings-RegCode] ❌ Error setting registration code:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verify registration code (PUBLIC - for registration)
router.post('/registration-code/verify', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Code is required' });
    }
    
    const { getSequelize } = require('../config/db');
    const sequelize = getSequelize();
    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: ['registration_code'],
        type: QueryTypes.SELECT
      }
    );
    const storedCode = result?.[0]?.setting_value;
    
    console.log('[Settings-RegCode-Verify] Submitted:', code, 'Stored:', storedCode);
    
    if (!storedCode) {
      return res.json({ valid: true, message: 'Registration code not required' });
    }
    
    if (code === storedCode) {
      console.log('[Settings-RegCode-Verify] ✓ Code valid');
      res.json({ valid: true, message: 'Code is valid' });
    } else {
      console.log('[Settings-RegCode-Verify] ❌ Code invalid');
      res.status(400).json({ valid: false, message: 'Invalid registration code' });
    }
  } catch (error) {
    console.error('[Settings-RegCode-Verify] Error:', error);
    res.status(500).json({ valid: false, message: error.message });
  }
});

router.get('/branding/public', async (req, res) => {
  try {
    const branding = await getAppBrandingConfig();
    res.json(branding);
  } catch (error) {
    console.error('[Settings-Branding-Public] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/branding', protect, async (req, res) => {
  try {
    const branding = await getAppBrandingConfig();
    res.json(branding);
  } catch (error) {
    console.error('[Settings-Branding] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/branding', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_BRANDING_UPDATE', entityType: 'setting' }), async (req, res) => {
  try {
    const branding = {
      ...DEFAULT_APP_BRANDING,
      ...req.body,
      appName: String(req.body?.appName || DEFAULT_APP_BRANDING.appName).trim(),
      appSubtitle: String(req.body?.appSubtitle || DEFAULT_APP_BRANDING.appSubtitle).trim(),
      browserTitle: String(req.body?.browserTitle || DEFAULT_APP_BRANDING.browserTitle).trim(),
      dashboardTitle: String(req.body?.dashboardTitle || DEFAULT_APP_BRANDING.dashboardTitle).trim(),
      dashboardSubtitle: String(req.body?.dashboardSubtitle || DEFAULT_APP_BRANDING.dashboardSubtitle).trim(),
      footerText: String(req.body?.footerText || DEFAULT_APP_BRANDING.footerText).trim(),
      logoUrl: String(req.body?.logoUrl || '').trim(),
      faviconUrl: String(req.body?.faviconUrl || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    if (!branding.appName) {
      return res.status(400).json({ message: 'App name is required' });
    }

    if (branding.logoUrl && branding.logoUrl.startsWith('data:') && branding.logoUrl.length > 60000) {
      return res.status(400).json({ message: 'Logo is too large. Please use a small image around 40 KB or less' });
    }

    if (branding.faviconUrl && branding.faviconUrl.startsWith('data:') && branding.faviconUrl.length > 40000) {
      return res.status(400).json({ message: 'Favicon is too large. Please use a small image around 20 KB or less' });
    }

    const sequelize = getSequelize();
    const value = JSON.stringify(branding);

    await sequelize.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      {
        replacements: ['app_branding', value, value],
        type: QueryTypes.INSERT,
      }
    );

    res.json({ message: 'Branding updated', branding });
  } catch (error) {
    console.error('[Settings-Branding] Save error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/registration-consent/public', async (req, res) => {
  try {
    const consent = await getRegistrationConsentConfig();
    res.json(consent);
  } catch (error) {
    console.error('[Settings-Consent-Public] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/registration-consent', protect, async (req, res) => {
  try {
    const consent = await getRegistrationConsentConfig();
    res.json(consent);
  } catch (error) {
    console.error('[Settings-Consent] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/registration-consent', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_REGISTRATION_CONSENT_UPDATE', entityType: 'setting' }), async (req, res) => {
  try {
    const payload = {
      ...DEFAULT_REGISTRATION_CONSENT,
      ...req.body,
      enabled: req.body?.enabled !== false,
      requireAccuracyConfirmation: req.body?.requireAccuracyConfirmation !== false,
      updatedAt: new Date().toISOString(),
    };

    if (!String(payload.title || '').trim()) {
      return res.status(400).json({ message: 'Consent title is required' });
    }

    if (!String(payload.content || '').trim()) {
      return res.status(400).json({ message: 'Consent content is required' });
    }

    if (!String(payload.checkboxLabel || '').trim()) {
      return res.status(400).json({ message: 'Consent checkbox label is required' });
    }

    const sequelize = getSequelize();
    const value = JSON.stringify(payload);

    await sequelize.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      {
        replacements: ['registration_consent', value, value],
        type: QueryTypes.INSERT,
      }
    );

    res.json({ message: 'Registration consent updated', consent: payload });
  } catch (error) {
    console.error('[Settings-Consent] Save error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ===== DATABASE SETTINGS =====

router.get('/database', protect, async (req, res) => {
  try {
    const config = await getDatabaseConfig();
    res.json({
      ...config,
      password: config.password || '',
      restartRequired: true,
    });
  } catch (error) {
    console.error('[Database] Error fetching config:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/database', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_DATABASE_UPDATE', entityType: 'setting' }), async (req, res) => {
  try {
    const { host, port, database, username, password } = req.body;

    if (!host || !database || !username) {
      return res.status(400).json({ message: 'Host, database, and username are required' });
    }

    const portNum = parseInt(port, 10) || 3306;
    if (portNum < 1 || portNum > 65535) {
      return res.status(400).json({ message: 'Port must be between 1 and 65535' });
    }

    const config = {
      host,
      port: portNum,
      database,
      username,
      password: password || '',
      dialect: 'mariadb',
    };

    const sequelize = getSequelize();
    await sequelize.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      {
        replacements: ['database_config', JSON.stringify(config), JSON.stringify(config)],
        type: QueryTypes.INSERT,
      }
    );

    process.env.DB_HOST = config.host;
    process.env.DB_PORT = String(config.port);
    process.env.DB_NAME = config.database;
    process.env.DB_USER = config.username;
    process.env.DB_PASS = config.password;

    res.json({
      message: 'Database configuration updated',
      config: { ...config, password: config.password ? '***' : '' },
      restartRequired: true,
    });
  } catch (error) {
    console.error('[Database] Error saving config:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/database/test', protect, requireActionAccess('settings', 'test'), async (req, res) => {
  let testSequelize;

  try {
    const savedConfig = await getDatabaseConfig();
    const config = {
      host: req.body.host || savedConfig.host,
      port: parseInt(req.body.port, 10) || savedConfig.port || 3306,
      database: req.body.database || savedConfig.database,
      username: req.body.username || savedConfig.username,
      password: req.body.password ?? savedConfig.password,
      dialect: 'mysql',
    };

    if (!config.host || !config.database || !config.username) {
      return res.status(400).json({ success: false, message: 'Incomplete database configuration' });
    }

    testSequelize = new Sequelize(config.database, config.username, config.password, {
      host: config.host,
      port: config.port,
      dialect: 'mysql',
      logging: false,
    });

    await testSequelize.authenticate();

    res.json({
      success: true,
      message: 'เชื่อมต่อ MariaDB สำเร็จ',
      info: {
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
      },
    });
  } catch (error) {
    console.error('[Database] Test connection failed:', error.message);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    if (testSequelize) {
      await testSequelize.close().catch(() => {});
    }
  }
});

router.get('/alerts', protect, requireActionAccess('settings', 'view'), async (req, res) => {
  try {
    const config = await getAlertConfig();
    res.json(config);
  } catch (error) {
    console.error('[Alerts] Error fetching config:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/alerts', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_ALERTS_UPDATE', entityType: 'setting' }), async (req, res) => {
  try {
    const config = await saveAlertConfig(req.body || {});
    res.json({ success: true, message: 'Alert settings updated successfully', config });
  } catch (error) {
    console.error('[Alerts] Error saving config:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/alerts/test', protect, requireActionAccess('settings', 'test'), auditAction({ action: 'SETTINGS_ALERTS_TEST', entityType: 'setting' }), async (req, res) => {
  try {
    const config = req.body?.config || await getAlertConfig();
    const message = String(req.body?.message || '✅ Test alert from MT-API').trim() || '✅ Test alert from MT-API';
    const result = await sendConfiguredAlert(message, { config });
    res.json({ success: !!result.success, ...result });
  } catch (error) {
    console.error('[Alerts] Error sending test alert:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/audit-logs', protect, requireActionAccess('reports', 'view'), async (req, res) => {
  try {
    const AuditLog = getAuditLog();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const where = {};

    if (req.query.action && req.query.action !== 'all') {
      where.action = req.query.action;
    }

    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) {
        const from = new Date(req.query.from);
        from.setHours(0, 0, 0, 0);
        if (!Number.isNaN(from.getTime())) {
          where.createdAt[Sequelize.Op.gte] = from;
        }
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        if (!Number.isNaN(to.getTime())) {
          where.createdAt[Sequelize.Op.lte] = to;
        }
      }
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
    });

    res.json(logs.map((item) => ({
      ...item.toJSON(),
      details: item.details ? JSON.parse(item.details) : null,
    })));
  } catch (error) {
    console.error('[Settings] Error fetching audit logs:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/backup/status', protect, requireActionAccess('reports', 'view'), async (req, res) => {
  try {
    const status = await getBackupSchedulerStatus();
    res.json(status);
  } catch (error) {
    console.error('[Settings] Error getting backup status:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/backup/run', protect, requireActionAccess('reports', 'backup'), auditAction({ action: 'SETTINGS_BACKUP_RUN', entityType: 'backup' }), async (req, res) => {
  try {
    const result = await writeAutoBackupFile('manual');
    res.json({
      message: 'สร้างไฟล์ backup สำเร็จ',
      fileName: result.fileName,
      filePath: result.filePath,
    });
  } catch (error) {
    console.error('[Settings] Error running backup:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/backup', protect, requireActionAccess('reports', 'view'), async (req, res) => {
  try {
    const backup = await buildBackupPayload();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mt-api-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('[Settings] Error creating backup:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/restore', protect, requireActionAccess('reports', 'backup'), auditAction({ action: 'SETTINGS_RESTORE', entityType: 'backup' }), async (req, res) => {
  const sequelize = getSequelize();
  const models = getModels();
  const transaction = await sequelize.transaction();

  try {
    const backup = req.body || {};
    const settings = backup.settings || {};

    if (Array.isArray(backup.positions)) {
      await models.Position.destroy({ where: {}, transaction });
      for (const position of backup.positions) {
        if (!position?.name) continue;
        await models.Position.create({
          name: position.name,
          description: position.description || '',
        }, { transaction });
      }
    }

    if (Array.isArray(backup.departments)) {
      await models.Department.destroy({ where: {}, transaction });
      for (const department of backup.departments) {
        if (!department?.name) continue;
        await models.Department.create({
          name: department.name,
          description: department.description || '',
        }, { transaction });
      }
    }

    const settingEntries = [
      ['registration_code', settings.registration_code ?? null],
      ['registration_consent', settings.registration_consent ? JSON.stringify(settings.registration_consent) : null],
      ['app_branding', settings.app_branding ? JSON.stringify(settings.app_branding) : null],
      ['mikrotik_config', settings.mikrotik_config ? JSON.stringify(settings.mikrotik_config) : null],
      ['database_config', settings.database_config ? JSON.stringify(settings.database_config) : null],
      ['dashboard_access_control', settings.dashboard_access_control ? JSON.stringify(settings.dashboard_access_control) : null],
      ['alert_channels', settings.alert_channels ? JSON.stringify(settings.alert_channels) : null],
    ];

    for (const [key, value] of settingEntries) {
      if (value === null || value === undefined || value === '') {
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
          await sequelize.query('DELETE FROM settings WHERE setting_key = ?', {
            replacements: [key],
            type: QueryTypes.DELETE,
            transaction,
          });
        }
        continue;
      }

      await sequelize.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        {
          replacements: [key, value, value],
          type: QueryTypes.INSERT,
          transaction,
        }
      );
    }

    await transaction.commit();

    res.json({
      message: 'Restore settings สำเร็จ',
      restored: {
        positions: Array.isArray(backup.positions) ? backup.positions.length : 0,
        departments: Array.isArray(backup.departments) ? backup.departments.length : 0,
        settings: Object.keys(settings).length,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[Settings] Error restoring backup:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/access-control', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const overview = await getAccessControlOverview();
    res.json({ success: true, ...overview });
  } catch (error) {
    console.error('[AccessControl] Error fetching overview:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/access-control/roles', protect, requireRole('super_admin'), auditAction({ action: 'ACCESS_CONTROL_ROLES_UPDATE', entityType: 'setting' }), async (req, res) => {
  try {
    await saveRoleDefinitions(req.body?.roles || []);
    const overview = await getAccessControlOverview();
    res.json({ success: true, message: 'Role permissions updated successfully', ...overview });
  } catch (error) {
    console.error('[AccessControl] Error saving roles:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/access-control/users', protect, requireRole('super_admin'), auditAction({ action: 'ACCESS_CONTROL_USER_CREATE', entityType: 'account' }), async (req, res) => {
  try {
    await addManagedUser(req.body || {});
    const overview = await getAccessControlOverview();
    res.status(201).json({ success: true, message: 'Dashboard user created successfully', users: overview.users });
  } catch (error) {
    console.error('[AccessControl] Error creating user:', error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/access-control/users/:id', protect, requireRole('super_admin'), auditAction({ action: 'ACCESS_CONTROL_USER_UPDATE', entityType: 'account' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await updateManagedUser(id, req.body || {});
    const overview = await getAccessControlOverview();
    res.json({ success: true, message: 'Dashboard user updated successfully', users: overview.users });
  } catch (error) {
    console.error('[AccessControl] Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/access-control/users/:id', protect, requireRole('super_admin'), auditAction({ action: 'ACCESS_CONTROL_USER_DELETE', entityType: 'account' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await deleteManagedUser(id);
    const overview = await getAccessControlOverview();
    res.json({ success: true, message: 'Dashboard user deleted successfully', users: overview.users });
  } catch (error) {
    console.error('[AccessControl] Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
});

// ===== MIKROTIK SETTINGS =====

// Get MikroTik configuration (ADMIN)
router.get('/mikrotik', protect, requireActionAccess('settings', 'view'), async (req, res) => {
  try {
    const config = await getMikrotikConfig();
    
    console.log('[MikroTik] Config retrieved:', { ...config, password: config.password ? '***' : '' });
    res.json(config);
  } catch (error) {
    console.error('[MikroTik] Error fetching config:', error);
    res.status(500).json({ message: error.message });
  }
});

// Set MikroTik configuration (ADMIN)
router.post('/mikrotik', protect, requireActionAccess('settings', 'update'), auditAction({ action: 'SETTINGS_MIKROTIK_UPDATE', entityType: 'setting' }), async (req, res) => {
  try {
    const { ip, port, username, password, os_version } = req.body;
    
    // Validate required fields
    if (!ip || !username || !password) {
      return res.status(400).json({ message: 'IP, username, and password are required' });
    }
    
    const portNum = parseInt(port) || 8728;
    
    if (portNum < 1 || portNum > 65535) {
      return res.status(400).json({ message: 'Port must be between 1 and 65535' });
    }
    
    // Validate OS version
    const version = os_version && (os_version === 'v6' || os_version === 'v7') ? os_version : 'v7';
    
    const config = {
      ip,
      port: portNum,
      username,
      password,
      os_version: version
    };
    
    const { getSequelize } = require('../config/db');
    const sequelize = getSequelize();
    
    console.log('[MikroTik] Saving config:', { ...config, password: '***' });
    
    await sequelize.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      {
        replacements: ['mikrotik_config', JSON.stringify(config), JSON.stringify(config)],
        type: QueryTypes.INSERT
      }
    );
    
    console.log('[MikroTik] ✓ Config saved (Version:', version + ')');
    res.json({ message: 'MikroTik configuration updated', config: { ...config, password: '***' } });
  } catch (error) {
    console.error('[MikroTik] ❌ Error setting config:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test MikroTik connection (ADMIN)
router.post('/mikrotik/test', protect, async (req, res) => {
  try {
    const config = await getMikrotikConfig();

    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ valid: false, message: 'Incomplete MikroTik configuration' });
    }

    console.log('[MikroTik-Test] Testing connection to:', config.ip, `(${config.os_version || 'v7'})`);

    const mikrotik = new MikroTikAPI(config);
    await mikrotik.testConnection();
    const activeTransport = mikrotik.lastTransport || 'UNKNOWN';

    res.json({
      valid: true,
      message: `Successfully connected to MikroTik (${config.os_version || 'v7'} via ${activeTransport})`,
      transport: activeTransport,
      diagnostics: buildMikrotikDiagnostics(config, activeTransport),
      config: { ...config, password: '***' }
    });
  } catch (error) {
    console.error('[MikroTik-Test] Error:', error);
    res.status(400).json({ valid: false, message: error.message });
  }
});

// Get MikroTik System Status (ADMIN)
router.get('/mikrotik/status', protect, requireActionAccess('settings', 'test'), async (req, res) => {
  try {
    const config = await getMikrotikConfig();
    
    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ 
        message: 'Incomplete MikroTik configuration. Please set credentials in Settings.' 
      });
    }
    
    console.log('[MikroTik-Status] ========================================');
    console.log('[MikroTik-Status] IP Address: ' + config.ip);
    console.log('[MikroTik-Status] Port: ' + config.port);
    console.log('[MikroTik-Status] Username: ' + config.username);
    console.log('[MikroTik-Status] OS Version: ' + config.os_version);
    console.log('[MikroTik-Status] ========================================');
    
    const mikrotik = new MikroTikAPI(config);
    const [status, interfaces, users] = await Promise.all([
      mikrotik.getSystemInfo(),
      mikrotik.getInterfaces(),
      mikrotik.getHotspotUsers(),
    ]);

    const models = getModels();
    const pendingApprovals = models.UserRequest
      ? await models.UserRequest.count({ where: { status: 'pending' } })
      : 0;

    const summary = {
      totalUsers: users.length,
      activeUsers: users.filter((user) => !user.disabled).length,
      disabledUsers: users.filter((user) => user.disabled).length,
      totalInterfaces: interfaces.length,
      onlineInterfaces: interfaces.filter((iface) => iface.running && !iface.disabled).length,
      pendingApprovals,
    };
    
    const activeTransport = status.transport || mikrotik.lastTransport || 'UNKNOWN';

    res.json({
      success: true,
      status: {
        ...status,
        summary,
      },
      dataSource: status.dataSource || 'UNKNOWN',
      transport: activeTransport,
      diagnostics: buildMikrotikDiagnostics(config, activeTransport),
      message: 'Connected to MikroTik at ' + config.ip + ' (Version: ' + config.os_version + ')'
    });
    
  } catch (error) {
    console.error('[MikroTik-Status] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get MikroTik Interfaces (ADMIN)
router.get('/mikrotik/interfaces', protect, async (req, res) => {
  try {
    const config = await getMikrotikConfig();
    
    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ 
        message: 'Incomplete MikroTik configuration'
      });
    }
    
    console.log('[MikroTik-Interfaces] ========================================');
    console.log('[MikroTik-Interfaces] Fetching from IP: ' + config.ip);
    console.log('[MikroTik-Interfaces] Port: ' + config.port);
    console.log('[MikroTik-Interfaces] OS Version: ' + config.os_version);
    console.log('[MikroTik-Interfaces] ========================================');
    
    const mikrotik = new MikroTikAPI(config);
    const interfaces = await mikrotik.getInterfaces();
    const activeTransport = mikrotik.lastTransport || 'UNKNOWN';
    
    // Determine overall data source if all items have the same source
    const dataSources = interfaces.map(i => i.dataSource);
    const overallDataSource = dataSources.every(d => d === dataSources[0]) ? dataSources[0] : 'MIXED';
    
    res.json({
      success: true,
      interfaces: interfaces,
      dataSource: overallDataSource,
      transport: activeTransport,
      diagnostics: buildMikrotikDiagnostics(config, activeTransport),
      os_version: config.os_version,
      host: config.ip
    });
    
  } catch (error) {
    console.error('[MikroTik-Interfaces] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get MikroTik Hotspot Users (ADMIN)
router.get('/mikrotik/hotspot-users', protect, async (req, res) => {
  try {
    const config = await getMikrotikConfig();
    
    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ 
        message: 'Incomplete MikroTik configuration'
      });
    }
    
    console.log('[MikroTik-Hotspot] ========================================');
    console.log('[MikroTik-Hotspot] Fetching from IP: ' + config.ip);
    console.log('[MikroTik-Hotspot] Port: ' + config.port);
    console.log('[MikroTik-Hotspot] OS Version: ' + config.os_version);
    console.log('[MikroTik-Hotspot] ========================================');
    
    const mikrotik = new MikroTikAPI(config);
    const users = await mikrotik.getHotspotUsers();
    const activeTransport = mikrotik.lastTransport || 'UNKNOWN';
    
    // Determine overall data source if all items have the same source
    const dataSources = users.map(u => u.dataSource);
    const overallDataSource = dataSources.length > 0 && dataSources.every(d => d === dataSources[0]) ? dataSources[0] : 'MIXED';
    
    res.json({
      success: true,
      users: users,
      dataSource: overallDataSource,
      transport: activeTransport,
      diagnostics: buildMikrotikDiagnostics(config, activeTransport),
      total: users.length,
      os_version: config.os_version,
      host: config.ip
    });
    
  } catch (error) {
    console.error('[MikroTik-Hotspot] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/hotspot-users/:username/disable', protect, async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username || '');
    const success = await disableHotspotUser(username);

    if (!success) {
      return res.status(404).json({ message: 'Hotspot user not found' });
    }

    res.json({ success: true, message: 'User disabled successfully', username });
  } catch (error) {
    console.error('[MikroTik-Hotspot] Disable error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/hotspot-users/:username/enable', protect, async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username || '');
    const success = await enableHotspotUser(username);

    if (!success) {
      return res.status(404).json({ message: 'Hotspot user not found' });
    }

    res.json({ success: true, message: 'User enabled successfully', username });
  } catch (error) {
    console.error('[MikroTik-Hotspot] Enable error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/mikrotik/hotspot-users/:username', protect, async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username || '');
    const success = await removeHotspotUser(username);

    if (!success) {
      return res.status(404).json({ message: 'Hotspot user not found' });
    }

    res.json({ success: true, message: 'User deleted successfully', username });
  } catch (error) {
    console.error('[MikroTik-Hotspot] Delete error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get('/mikrotik/hotspot-servers', protect, async (req, res) => {
  try {
    const config = await getMikrotikConfig();

    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ message: 'Incomplete MikroTik configuration' });
    }

    const servers = await getHotspotServers();
    const withAllOption = [
      { id: 'all', name: 'all', interface: '', profile: '', disabled: false, dataSource: 'VIRTUAL' },
      ...servers.filter((server) => server.name !== 'all'),
    ];

    res.json({
      success: true,
      servers: withAllOption,
      total: withAllOption.length,
      diagnostics: buildMikrotikDiagnostics(config),
      os_version: config.os_version,
      host: config.ip,
    });
  } catch (error) {
    console.error('[MikroTik-HotspotServers] List error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get MikroTik IP Bindings (ADMIN)
router.get('/mikrotik/ip-bindings', protect, async (req, res) => {
  try {
    const config = await getMikrotikConfig();

    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ message: 'Incomplete MikroTik configuration' });
    }

    const bindings = await getIpBindings();

    res.json({
      success: true,
      bindings,
      total: bindings.length,
      diagnostics: buildMikrotikDiagnostics(config),
      os_version: config.os_version,
      host: config.ip,
    });
  } catch (error) {
    console.error('[MikroTik-IPBinding] List error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/ip-bindings', protect, requireActionAccess('ip-binding', 'manage'), auditAction({ action: 'MIKROTIK_IP_BINDING_CREATE', entityType: 'ip_binding' }), async (req, res) => {
  try {
    const binding = await addIpBinding(req.body || {});
    res.status(201).json({ success: true, message: 'IP Binding created successfully', binding });
  } catch (error) {
    console.error('[MikroTik-IPBinding] Create error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.put('/mikrotik/ip-bindings/:id', protect, requireActionAccess('ip-binding', 'manage'), auditAction({ action: 'MIKROTIK_IP_BINDING_UPDATE', entityType: 'ip_binding' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    const binding = await updateIpBinding(id, req.body || {});
    res.json({ success: true, message: 'IP Binding updated successfully', binding });
  } catch (error) {
    console.error('[MikroTik-IPBinding] Update error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/ip-bindings/:id/disable', protect, requireActionAccess('ip-binding', 'manage'), auditAction({ action: 'MIKROTIK_IP_BINDING_DISABLE', entityType: 'ip_binding' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await disableIpBinding(id);
    res.json({ success: true, message: 'IP Binding disabled successfully', id });
  } catch (error) {
    console.error('[MikroTik-IPBinding] Disable error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/ip-bindings/:id/enable', protect, requireActionAccess('ip-binding', 'manage'), auditAction({ action: 'MIKROTIK_IP_BINDING_ENABLE', entityType: 'ip_binding' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await enableIpBinding(id);
    res.json({ success: true, message: 'IP Binding enabled successfully', id });
  } catch (error) {
    console.error('[MikroTik-IPBinding] Enable error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/mikrotik/ip-bindings/:id', protect, requireActionAccess('ip-binding', 'manage'), auditAction({ action: 'MIKROTIK_IP_BINDING_DELETE', entityType: 'ip_binding' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await removeIpBinding(id);
    res.json({ success: true, message: 'IP Binding deleted successfully', id });
  } catch (error) {
    console.error('[MikroTik-IPBinding] Delete error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get('/mikrotik/walled-garden', protect, async (req, res) => {
  try {
    const config = await getMikrotikConfig();

    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ message: 'Incomplete MikroTik configuration' });
    }

    const rules = await getWalledGardens();

    res.json({
      success: true,
      rules,
      total: rules.length,
      diagnostics: buildMikrotikDiagnostics(config),
      os_version: config.os_version,
      host: config.ip,
    });
  } catch (error) {
    console.error('[MikroTik-WalledGarden] List error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/walled-garden', protect, requireActionAccess('walled-garden', 'manage'), auditAction({ action: 'MIKROTIK_WALLED_GARDEN_CREATE', entityType: 'walled_garden' }), async (req, res) => {
  try {
    const rule = await addWalledGarden(req.body || {});
    res.status(201).json({ success: true, message: 'Walled Garden rule created successfully', rule });
  } catch (error) {
    console.error('[MikroTik-WalledGarden] Create error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.put('/mikrotik/walled-garden/:id', protect, requireActionAccess('walled-garden', 'manage'), auditAction({ action: 'MIKROTIK_WALLED_GARDEN_UPDATE', entityType: 'walled_garden' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    const rule = await updateWalledGarden(id, req.body || {});
    res.json({ success: true, message: 'Walled Garden rule updated successfully', rule });
  } catch (error) {
    console.error('[MikroTik-WalledGarden] Update error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/walled-garden/:id/disable', protect, requireActionAccess('walled-garden', 'manage'), auditAction({ action: 'MIKROTIK_WALLED_GARDEN_DISABLE', entityType: 'walled_garden' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await disableWalledGarden(id);
    res.json({ success: true, message: 'Walled Garden rule disabled successfully', id });
  } catch (error) {
    console.error('[MikroTik-WalledGarden] Disable error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post('/mikrotik/walled-garden/:id/enable', protect, requireActionAccess('walled-garden', 'manage'), auditAction({ action: 'MIKROTIK_WALLED_GARDEN_ENABLE', entityType: 'walled_garden' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await enableWalledGarden(id);
    res.json({ success: true, message: 'Walled Garden rule enabled successfully', id });
  } catch (error) {
    console.error('[MikroTik-WalledGarden] Enable error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/mikrotik/walled-garden/:id', protect, requireActionAccess('walled-garden', 'manage'), auditAction({ action: 'MIKROTIK_WALLED_GARDEN_DELETE', entityType: 'walled_garden' }), async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    await removeWalledGarden(id);
    res.json({ success: true, message: 'Walled Garden rule deleted successfully', id });
  } catch (error) {
    console.error('[MikroTik-WalledGarden] Delete error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get MikroTik Bandwidth Monitor (ADMIN)
router.get('/mikrotik/bandwidth', protect, async (req, res) => {
  try {
    const config = await getMikrotikConfig();
    
    if (!config.ip || !config.port || !config.username || !config.password) {
      return res.status(400).json({ 
        message: 'Incomplete MikroTik configuration'
      });
    }
    
    console.log('[MikroTik-Bandwidth] ========================================');
    console.log('[MikroTik-Bandwidth] Fetching from IP: ' + config.ip);
    console.log('[MikroTik-Bandwidth] Port: ' + config.port);
    console.log('[MikroTik-Bandwidth] OS Version: ' + config.os_version);
    console.log('[MikroTik-Bandwidth] ========================================');
    
    const mikrotik = new MikroTikAPI(config);
    const bandwidth = await mikrotik.getBandwidth();
    const activeTransport = mikrotik.lastTransport || 'UNKNOWN';
    
    // Determine overall data source if all items have the same source
    const dataSources = bandwidth.map(b => b.dataSource);
    const overallDataSource = dataSources.every(d => d === dataSources[0]) ? dataSources[0] : 'MIXED';
    
    res.json({
      success: true,
      bandwidth: bandwidth,
      dataSource: overallDataSource,
      transport: activeTransport,
      diagnostics: buildMikrotikDiagnostics(config, activeTransport),
      timestamp: new Date().toISOString(),
      os_version: config.os_version,
      host: config.ip
    });
    
  } catch (error) {
    console.error('[MikroTik-Bandwidth] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = router;
