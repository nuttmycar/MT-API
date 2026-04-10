const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../config/db');

const ACCESS_CONTROL_SETTING_KEY = 'dashboard_access_control';

const MENU_DEFINITIONS = [
  { key: 'users', label: 'ผู้ใช้' },
  { key: 'system', label: 'สถานะระบบ' },
  { key: 'reports', label: 'รายงาน' },
  { key: 'mikrotik', label: 'MikroTik' },
  { key: 'ip-binding', label: 'IP Binding' },
  { key: 'walled-garden', label: 'Walled Garden' },
  { key: 'settings', label: 'Settings' },
  { key: 'access-control', label: 'Role & Permission' },
];

const MENU_KEYS = MENU_DEFINITIONS.map((item) => item.key);
const SYSTEM_ROLE_ORDER = ['super_admin', 'admin', 'viewer'];
const SYSTEM_ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
};

const normalizeRoleKey = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const generateId = (prefix = 'item') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const buildPermissionMap = (roleKey = '', providedPermissions = {}) => {
  const key = normalizeRoleKey(roleKey);
  const defaults = MENU_KEYS.reduce((acc, item) => {
    acc[item] = false;
    return acc;
  }, {});

  if (key === 'super_admin') {
    MENU_KEYS.forEach((item) => {
      defaults[item] = true;
    });
  } else if (key === 'admin') {
    ['users', 'system', 'reports', 'mikrotik', 'ip-binding', 'walled-garden', 'settings'].forEach((item) => {
      defaults[item] = true;
    });
  } else if (key === 'viewer') {
    ['users', 'system', 'reports'].forEach((item) => {
      defaults[item] = true;
    });
  }

  const permissions = MENU_KEYS.reduce((acc, item) => {
    acc[item] = key === 'super_admin'
      ? true
      : (providedPermissions?.[item] ?? defaults[item] ?? false);
    return acc;
  }, {});

  return permissions;
};

const buildRoleDefinition = (role = {}) => {
  const key = normalizeRoleKey(role.key || role.role || role.name || 'viewer') || 'viewer';
  const permissions = buildPermissionMap(key, role.permissions || {});

  return {
    key,
    label: String(role.label || role.name || SYSTEM_ROLE_LABELS[key] || key).trim(),
    systemRole: SYSTEM_ROLE_ORDER.includes(key),
    permissions,
  };
};

const mergeRoles = (roles = []) => {
  const map = new Map();

  SYSTEM_ROLE_ORDER.forEach((key) => {
    const built = buildRoleDefinition({ key, label: SYSTEM_ROLE_LABELS[key] });
    map.set(key, built);
  });

  (Array.isArray(roles) ? roles : []).forEach((role) => {
    const normalized = buildRoleDefinition(role);
    const current = map.get(normalized.key);
    map.set(normalized.key, current
      ? {
          ...current,
          ...normalized,
          permissions: {
            ...current.permissions,
            ...normalized.permissions,
          },
        }
      : normalized);
  });

  return Array.from(map.values()).sort((a, b) => {
    const aIndex = SYSTEM_ROLE_ORDER.indexOf(a.key);
    const bIndex = SYSTEM_ROLE_ORDER.indexOf(b.key);

    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }

    return a.label.localeCompare(b.label, 'en');
  });
};

const sanitizeStoredUser = (user = {}, roles = []) => {
  const roleKey = normalizeRoleKey(user.role || 'viewer') || 'viewer';
  const roleExists = roles.some((role) => role.key === roleKey);

  return {
    id: user.id || generateId('usr'),
    username: String(user.username || '').trim(),
    password: String(user.password || ''),
    role: roleExists ? roleKey : 'viewer',
    enabled: user.enabled !== false,
    note: String(user.note || '').trim(),
    source: 'managed',
    readOnly: false,
  };
};

const getDefaultConfig = () => ({
  menuDefinitions: MENU_DEFINITIONS,
  roles: mergeRoles([]),
  users: [],
});

const getAccessControlConfig = async () => {
  const fallback = getDefaultConfig();

  try {
    const sequelize = getSequelize();
    if (!sequelize) {
      return fallback;
    }

    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: [ACCESS_CONTROL_SETTING_KEY],
        type: QueryTypes.SELECT,
      }
    );

    if (!result?.[0]?.setting_value) {
      return fallback;
    }

    const parsed = JSON.parse(result[0].setting_value || '{}');
    const roles = mergeRoles(parsed.roles || []);
    const users = (Array.isArray(parsed.users) ? parsed.users : [])
      .map((user) => sanitizeStoredUser(user, roles))
      .filter((user) => user.username);

    return {
      menuDefinitions: MENU_DEFINITIONS,
      roles,
      users,
    };
  } catch (error) {
    console.error('[AccessControl] Error loading config:', error.message);
    return fallback;
  }
};

const saveAccessControlConfig = async (payload = {}) => {
  const sequelize = getSequelize();
  if (!sequelize) {
    throw new Error('Database not initialized');
  }

  const roles = mergeRoles(payload.roles || []);
  const users = (Array.isArray(payload.users) ? payload.users : [])
    .map((user) => sanitizeStoredUser(user, roles))
    .filter((user) => user.username);

  const settingValue = JSON.stringify({ roles, users });

  await sequelize.query(
    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
    {
      replacements: [ACCESS_CONTROL_SETTING_KEY, settingValue, settingValue],
      type: QueryTypes.INSERT,
    }
  );

  return {
    menuDefinitions: MENU_DEFINITIONS,
    roles,
    users,
  };
};

const getRoleLabel = (roleKey = '', config = null) => {
  const normalized = normalizeRoleKey(roleKey);
  const roles = config?.roles || mergeRoles([]);
  return roles.find((role) => role.key === normalized)?.label || SYSTEM_ROLE_LABELS[normalized] || normalized || 'User';
};

const getPermissionsForRole = (roleKey = '', config = null) => {
  const normalized = normalizeRoleKey(roleKey) || 'viewer';
  const roles = config?.roles || mergeRoles([]);
  const matched = roles.find((role) => role.key === normalized);
  return matched?.permissions || buildPermissionMap(normalized);
};

const hasSectionAccess = async (roleKey = '', sectionKey = '') => {
  const normalizedRole = normalizeRoleKey(roleKey) || 'viewer';
  if (normalizedRole === 'super_admin') {
    return true;
  }

  const config = await getAccessControlConfig();
  const permissions = getPermissionsForRole(normalizedRole, config);
  return !!permissions[sectionKey];
};

const getEnvAccounts = (config = null) => [
  {
    id: 'env-super-admin',
    username: process.env.SUPER_ADMIN_USERNAME || process.env.ADMIN_USERNAME,
    password: process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
    role: 'super_admin',
    label: getRoleLabel('super_admin', config),
    enabled: true,
    note: 'Environment account',
    source: 'env',
    readOnly: true,
  },
  {
    id: 'env-admin',
    username: process.env.MANAGER_USERNAME,
    password: process.env.MANAGER_PASSWORD,
    role: 'admin',
    label: getRoleLabel('admin', config),
    enabled: true,
    note: 'Environment account',
    source: 'env',
    readOnly: true,
  },
  {
    id: 'env-viewer',
    username: process.env.VIEWER_USERNAME,
    password: process.env.VIEWER_PASSWORD,
    role: 'viewer',
    label: getRoleLabel('viewer', config),
    enabled: true,
    note: 'Environment account',
    source: 'env',
    readOnly: true,
  },
].filter((account) => account.username && account.password);

const getAvailableAccounts = async () => {
  const config = await getAccessControlConfig();
  const envAccounts = getEnvAccounts(config);
  const managedAccounts = config.users
    .filter((account) => account.enabled && account.username && account.password)
    .map((account) => ({
      ...account,
      label: getRoleLabel(account.role, config),
    }));

  const deduped = [...envAccounts, ...managedAccounts].filter((account, index, list) => (
    list.findIndex((item) => item.username === account.username) === index
  ));

  return {
    config,
    accounts: deduped,
  };
};

const getAccessControlOverview = async () => {
  const config = await getAccessControlConfig();
  const envAccounts = getEnvAccounts(config).map((account) => ({
    ...account,
    password: account.password ? '••••••' : '',
  }));
  const managedUsers = config.users.map((account) => ({
    ...account,
    label: getRoleLabel(account.role, config),
    password: account.password ? '••••••' : '',
  }));

  return {
    menuDefinitions: MENU_DEFINITIONS,
    roles: config.roles,
    users: [...envAccounts, ...managedUsers],
  };
};

const saveRoleDefinitions = async (roles = []) => {
  const current = await getAccessControlConfig();
  return saveAccessControlConfig({
    roles,
    users: current.users,
  });
};

const addManagedUser = async (payload = {}) => {
  const current = await getAccessControlConfig();
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();
  const role = normalizeRoleKey(payload.role || 'viewer') || 'viewer';

  if (!username) {
    throw new Error('Username is required');
  }

  if (!password) {
    throw new Error('Password is required');
  }

  if (current.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists');
  }

  const nextUsers = [
    ...current.users,
    sanitizeStoredUser({
      id: generateId('usr'),
      username,
      password,
      role,
      enabled: payload.enabled !== false,
      note: payload.note || '',
    }, current.roles),
  ];

  return saveAccessControlConfig({ roles: current.roles, users: nextUsers });
};

const updateManagedUser = async (id, payload = {}) => {
  const current = await getAccessControlConfig();
  const targetIndex = current.users.findIndex((user) => user.id === id);

  if (targetIndex === -1) {
    throw new Error('Managed user not found');
  }

  const existing = current.users[targetIndex];
  const username = String(payload.username || existing.username || '').trim();
  const password = String(payload.password || '').trim() || existing.password;
  const role = normalizeRoleKey(payload.role || existing.role || 'viewer') || 'viewer';

  if (!username) {
    throw new Error('Username is required');
  }

  const duplicate = current.users.find((user) => user.id !== id && user.username.toLowerCase() === username.toLowerCase());
  if (duplicate) {
    throw new Error('Username already exists');
  }

  const nextUsers = [...current.users];
  nextUsers[targetIndex] = sanitizeStoredUser({
    ...existing,
    username,
    password,
    role,
    enabled: payload.enabled !== undefined ? payload.enabled !== false : existing.enabled,
    note: payload.note !== undefined ? payload.note : existing.note,
  }, current.roles);

  return saveAccessControlConfig({ roles: current.roles, users: nextUsers });
};

const deleteManagedUser = async (id) => {
  const current = await getAccessControlConfig();
  const nextUsers = current.users.filter((user) => user.id !== id);

  if (nextUsers.length === current.users.length) {
    throw new Error('Managed user not found');
  }

  return saveAccessControlConfig({ roles: current.roles, users: nextUsers });
};

module.exports = {
  ACCESS_CONTROL_SETTING_KEY,
  MENU_DEFINITIONS,
  MENU_KEYS,
  getAccessControlConfig,
  getAccessControlOverview,
  getAvailableAccounts,
  getPermissionsForRole,
  getRoleLabel,
  hasSectionAccess,
  normalizeRoleKey,
  saveRoleDefinitions,
  addManagedUser,
  updateManagedUser,
  deleteManagedUser,
};
