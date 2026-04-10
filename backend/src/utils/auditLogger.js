const { getAuditLog } = require('../models/AuditLog');

const REDACTED_KEYS = ['password', 'token', 'authorization', 'mikrotik_pass', 'db_pass'];

const sanitizeAuditPayload = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (depth > 3) return '[MaxDepth]';

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeAuditPayload(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      const lowerKey = String(key).toLowerCase();
      acc[key] = REDACTED_KEYS.some((item) => lowerKey.includes(item))
        ? '***'
        : sanitizeAuditPayload(val, depth + 1);
      return acc;
    }, {});
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}...`;
  }

  return value;
};

const recordAuditEvent = async ({
  action,
  entityType = 'system',
  entityId = null,
  actorUsername = 'system',
  actorRole = 'system',
  status = 'success',
  details = {},
}) => {
  try {
    if (!action) return null;

    const AuditLog = getAuditLog();
    return await AuditLog.create({
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      actorUsername,
      actorRole,
      status,
      details: JSON.stringify(sanitizeAuditPayload(details)),
    });
  } catch (error) {
    console.error('[AuditLog] Failed to write audit event:', error.message);
    return null;
  }
};

const logAuditEvent = async (req, payload = {}) => {
  const user = req?.user || req?.admin || {};

  return recordAuditEvent({
    actorUsername: user.username || 'anonymous',
    actorRole: user.role || 'guest',
    ...payload,
  });
};

module.exports = {
  logAuditEvent,
  recordAuditEvent,
  sanitizeAuditPayload,
};
