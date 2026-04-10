const { DataTypes } = require('sequelize');

let AuditLog;

const initAuditLog = (sequelize) => {
  AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'system',
    },
    entityId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    actorUsername: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'system',
    },
    actorRole: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'system',
    },
    status: {
      type: DataTypes.ENUM('success', 'warning', 'failed', 'info'),
      allowNull: false,
      defaultValue: 'success',
    },
    details: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });

  return AuditLog;
};

const getAuditLog = () => {
  if (!AuditLog) {
    throw new Error('AuditLog model not initialized. Call initAuditLog() first.');
  }
  return AuditLog;
};

module.exports = { initAuditLog, getAuditLog };
