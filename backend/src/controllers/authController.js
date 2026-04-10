const jwt = require('jsonwebtoken');
const {
  getAvailableAccounts,
  getPermissionsForRole,
  getRoleLabel,
} = require('../utils/accessControl');

exports.loginAdmin = async (req, res) => {
  console.log('[LOGIN] Request received:', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('[LOGIN] Missing credentials');
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const { accounts, config } = await getAvailableAccounts();
  const matchedAccount = accounts.find((account) => (
    account.username === username && account.password === password
  ));

  console.log('[LOGIN] Available accounts:', accounts.map((item) => ({ username: item.username, role: item.role, source: item.source })));

  if (!matchedAccount) {
    console.log('[LOGIN] Invalid credentials');
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
