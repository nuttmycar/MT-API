const jwt = require('jsonwebtoken');
const { getAccessControlConfig, getPermissionsForRole } = require('../utils/accessControl');

exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.admin = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.requireRole = (...allowedRoles) => (req, res, next) => {
  if (allowedRoles.length === 0) {
    return next();
  }

  const role = req.user?.role || req.admin?.role;

  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({
      message: `Forbidden: requires one of [${allowedRoles.join(', ')}]`,
    });
  }

  return next();
};

const resolvePermissions = async (req) => {
  const role = req.user?.role || req.admin?.role || 'guest';
  const config = await getAccessControlConfig();
  return getPermissionsForRole(role, config);
};

exports.requireSectionAccess = (sectionKey) => async (req, res, next) => {
  try {
    const role = req.user?.role || req.admin?.role || 'guest';
    const permissions = await resolvePermissions(req);

    if (role === 'super_admin' || permissions?.[sectionKey]) {
      return next();
    }

    return res.status(403).json({
      message: `Forbidden: no access to section '${sectionKey}'`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Permission check failed' });
  }
};

exports.requireAnySectionAccess = (...sectionKeys) => async (req, res, next) => {
  try {
    const role = req.user?.role || req.admin?.role || 'guest';
    const permissions = await resolvePermissions(req);

    if (role === 'super_admin' || sectionKeys.some((key) => permissions?.[key])) {
      return next();
    }

    return res.status(403).json({
      message: `Forbidden: requires section access to one of [${sectionKeys.join(', ')}]`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Permission check failed' });
  }
};
