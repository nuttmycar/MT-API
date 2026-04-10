const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const {
  getAvailableAccounts,
  getPermissionsForRole,
  getRoleLabel,
} = require('../utils/accessControl');
const { getLoginHistory } = require('../models/LoginHistory');
const { recordAuditEvent } = require('../utils/auditLogger');

const getClientIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.socket?.remoteAddress
  || req.ip
  || ''
);

const recordLoginAttempt = async ({ req, username = '', role = 'guest', status = 'success', message = '' }) => {
  try {
    const LoginHistory = getLoginHistory();
    await LoginHistory.create({
      username: String(username || '').trim() || 'anonymous',
      role: String(role || 'guest').trim() || 'guest',
      status,
      source: 'dashboard',
      ipAddress: getClientIp(req),
      userAgent: String(req.headers['user-agent'] || ''),
      message: String(message || '').slice(0, 255),
      metadata: JSON.stringify({ path: req.originalUrl, method: req.method }),
    });
  } catch (error) {
    console.error('[LOGIN] Failed to record login history:', error.message);
  }

  await recordAuditEvent({
    action: status === 'success' ? 'AUTH_LOGIN_SUCCESS' : 'AUTH_LOGIN_FAILED',
    entityType: 'auth',
    actorUsername: String(username || '').trim() || 'anonymous',
    actorRole: String(role || 'guest').trim() || 'guest',
    status: status === 'success' ? 'success' : 'failed',
    details: {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      message,
      path: req.originalUrl,
    },
  });
};

exports.loginAdmin = async (req, res) => {
  console.log('[LOGIN] Request received:', req.body);
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    console.log('[LOGIN] Missing credentials');
    await recordLoginAttempt({
      req,
      username,
      status: 'failed',
      message: 'Username and password are required',
    });
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const { accounts, config } = await getAvailableAccounts();
  const matchedAccount = accounts.find((account) => (
    account.username === username && account.password === password
  ));

  console.log('[LOGIN] Available accounts:', accounts.map((item) => ({ username: item.username, role: item.role, source: item.source })));

  if (!matchedAccount) {
    console.log('[LOGIN] Invalid credentials');
    await recordLoginAttempt({
      req,
      username,
      status: 'failed',
      message: 'Invalid credentials',
    });
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const permissions = getPermissionsForRole(matchedAccount.role, config);
  const label = matchedAccount.label || getRoleLabel(matchedAccount.role, config);

  const token = jwt.sign(
    {
      username: matchedAccount.username,
      role: matchedAccount.role,
      label,
      permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  );

  await recordLoginAttempt({
    req,
    username: matchedAccount.username,
    role: matchedAccount.role,
    status: 'success',
    message: 'Dashboard login successful',
  });

  console.log('[LOGIN] Token generated successfully');
  return res.json({
    token,
    username: matchedAccount.username,
    role: matchedAccount.role,
    label,
    permissions,
  });
};

exports.getCurrentProfile = async (req, res) => {
  const role = req.user?.role || req.admin?.role || 'guest';
  const username = req.user?.username || req.admin?.username || '';
  const { config } = await getAvailableAccounts();
  const permissions = getPermissionsForRole(role, config);

  return res.json({
    username,
    role,
    label: getRoleLabel(role, config),
    permissions,
  });
};

exports.getLoginHistory = async (req, res) => {
  try {
    const LoginHistory = getLoginHistory();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 300);
    const where = {};

    if (req.query.status && req.query.status !== 'all') {
      where.status = req.query.status;
    }

    if (req.query.username) {
      where.username = { [Op.like]: `%${String(req.query.username).trim()}%` };
    }

    const rows = await LoginHistory.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
    });

    return res.json({
      success: true,
      items: rows.map((item) => ({
        ...item.toJSON(),
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
      })),
    });
  } catch (error) {
    console.error('[LOGIN] Failed to fetch login history:', error);
    return res.status(500).json({ message: error.message || 'Failed to load login history' });
  }
};
