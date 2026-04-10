const fs = require('fs').promises;
const path = require('path');
const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../config/db');

const AUTO_BACKUP_DIR = path.resolve(__dirname, '../../backups/auto');
const intervalHours = Math.max(1, Number(process.env.AUTO_BACKUP_HOURS || 24));
const keepFiles = Math.max(3, Number(process.env.AUTO_BACKUP_KEEP || 14));

const schedulerState = {
  enabled: true,
  intervalHours,
  keepFiles,
  startedAt: null,
  lastRunAt: null,
  lastFile: null,
  lastError: null,
};

let intervalHandle = null;

const ensureBackupDirectory = async () => {
  await fs.mkdir(AUTO_BACKUP_DIR, { recursive: true });
};

const buildBackupPayload = async () => {
  const sequelize = getSequelize();
  const models = sequelize.models;

  const [positions, departments, settingsRows] = await Promise.all([
    models.Position.findAll({ order: [['createdAt', 'DESC']] }),
    models.Department.findAll({ order: [['createdAt', 'DESC']] }),
    sequelize.query(
      'SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?, ?, ?, ?, ?, ?)',
      {
        replacements: ['registration_code', 'registration_consent', 'app_branding', 'mikrotik_config', 'database_config', 'dashboard_access_control', 'alert_channels'],
        type: QueryTypes.SELECT,
      }
    ),
  ]);

  const settings = {};
  settingsRows.forEach((row) => {
    if (row.setting_key === 'registration_code') {
      settings.registration_code = row.setting_value || '';
      return;
    }

    try {
      settings[row.setting_key] = row.setting_value ? JSON.parse(row.setting_value) : null;
    } catch (error) {
      settings[row.setting_key] = row.setting_value;
    }
  });

  return {
    app: 'MT-API',
    exportedAt: new Date().toISOString(),
    settings,
    positions: positions.map((item) => item.toJSON()),
    departments: departments.map((item) => item.toJSON()),
  };
};

const cleanupOldBackups = async () => {
  await ensureBackupDirectory();
  const files = (await fs.readdir(AUTO_BACKUP_DIR))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse();

  const oldFiles = files.slice(keepFiles);
  await Promise.all(oldFiles.map((file) => fs.unlink(path.join(AUTO_BACKUP_DIR, file)).catch(() => {})));
};

const writeAutoBackupFile = async (reason = 'manual') => {
  await ensureBackupDirectory();
  const backup = await buildBackupPayload();
  backup.reason = reason;

  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  const fileName = `mt-api-${reason}-backup-${stamp}.json`;
  const filePath = path.join(AUTO_BACKUP_DIR, fileName);

  await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf8');
  await cleanupOldBackups();

  schedulerState.lastRunAt = new Date().toISOString();
  schedulerState.lastFile = fileName;
  schedulerState.lastError = null;

  return { fileName, filePath, backup };
};

const getBackupSchedulerStatus = async () => {
  await ensureBackupDirectory();
  const recentFiles = (await fs.readdir(AUTO_BACKUP_DIR))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 10);

  return {
    ...schedulerState,
    directory: AUTO_BACKUP_DIR,
    recentFiles,
  };
};

const startBackupScheduler = () => {
  if (intervalHandle) {
    return schedulerState;
  }

  schedulerState.startedAt = new Date().toISOString();
  intervalHandle = setInterval(async () => {
    try {
      await writeAutoBackupFile('scheduled');
      console.log('[BackupScheduler] Auto backup created successfully');
    } catch (error) {
      schedulerState.lastError = error.message;
      console.error('[BackupScheduler] Auto backup failed:', error.message);
    }
  }, intervalHours * 60 * 60 * 1000);

  console.log(`[BackupScheduler] Started (every ${intervalHours} hour(s))`);
  return schedulerState;
};

module.exports = {
  AUTO_BACKUP_DIR,
  buildBackupPayload,
  writeAutoBackupFile,
  getBackupSchedulerStatus,
  startBackupScheduler,
};
