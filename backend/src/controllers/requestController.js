const { Op } = require('sequelize');
const { getUserRequest } = require('../models/UserRequest');
const {
  addHotspotUser,
  removeHotspotUser,
  getHotspotProfiles,
  getHotspotUsers,
  disableHotspotUser,
  enableHotspotUser,
} = require('../utils/mikrotik');
const { sendApprovalEmail } = require('../utils/emailService');

const buildRequestWhereClause = (query = {}) => {
  const where = {};
  const { from, to, status, department, position, search } = query;

  if (status && status !== 'all') {
    where.status = status;
  }

  if (department && department !== 'all') {
    where.department = department;
  }

  if (position && position !== 'all') {
    where.position = position;
  }

  if (from || to) {
    const createdAt = {};

    if (from) {
      const start = new Date(from);
      start.setHours(0, 0, 0, 0);
      if (!Number.isNaN(start.getTime())) {
        createdAt[Op.gte] = start;
      }
    }

    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (!Number.isNaN(end.getTime())) {
        createdAt[Op.lte] = end;
      }
    }

    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }
  }

  if (search && String(search).trim()) {
    const likeValue = `%${String(search).trim()}%`;
    where[Op.or] = [
      { fullName: { [Op.like]: likeValue } },
      { username: { [Op.like]: likeValue } },
      { email: { [Op.like]: likeValue } },
      { profile: { [Op.like]: likeValue } },
      { position: { [Op.like]: likeValue } },
      { department: { [Op.like]: likeValue } },
    ];
  }

  return where;
};

exports.createRequest = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const {
      fullName,
      username,
      email,
      password,
      profile,
      idCardNumber,
      phoneNumber,
      position,
      department,
      acceptedTerms,
      acceptedAccuracy,
    } = req.body;

    // Validation
    if (!fullName || !username || !email || !password || !idCardNumber || !phoneNumber || !position || !department) {
      return res.status(400).json({ message: 'All registration fields are required' });
    }

    if (!acceptedTerms) {
      return res.status(400).json({ message: 'Please accept the usage terms and privacy notice before registering' });
    }

    // Validate Thai ID Card (Luhn algorithm)
    if (!isValidThaiIdCard(idCardNumber)) {
      return res.status(400).json({ message: 'Invalid ID Card number' });
    }

    // Validate phone number (Thai format)
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check for existing username
    const existing = await UserRequest.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ message: 'This username is already in the queue' });
    }

    // Check for existing ID Card
    const existingIdCard = await UserRequest.findOne({ where: { idCardNumber } });
    if (existingIdCard) {
      return res.status(400).json({ message: 'This ID Card is already registered' });
    }

    const request = await UserRequest.create({
      fullName,
      username,
      email,
      password,
      profile: profile || 'default',
      idCardNumber,
      phoneNumber,
      position,
      department,
    });

    return res.status(201).json(request);
  } catch (error) {
    console.error('[RequestController] Error creating request:', error);
    next(error);
  }
};

// Thai ID Card Validation (Luhn Algorithm)
function isValidThaiIdCard(idCard) {
  // Remove any spaces or dashes
  const cleanId = idCard.replace(/[\s\-]/g, '');

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(cleanId)) {
    return false;
  }

  // Luhn algorithm check
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = parseInt(cleanId[i], 10);
    let multiplier = 13 - i;
    sum += digit * multiplier;
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(cleanId[12], 10);
}

// Phone number validation (Thai format: 08-10, 06-09)
function isValidPhoneNumber(phone) {
  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  
  // Thai mobile: 08-10 followed by 8 digits, or 06-09 followed by 8 digits
  // Or allow any 10 digit number starting with 0
  return /^0[6-9]\d{8}$/.test(cleanPhone);
}

exports.listRequests = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const where = buildRequestWhereClause(req.query);
    const requests = await UserRequest.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    let hotspotUsersByName = new Map();
    try {
      const hotspotUsers = await getHotspotUsers();
      hotspotUsersByName = new Map(hotspotUsers.map((user) => [user.name, user]));
    } catch (mikrotikError) {
      console.warn('[ListRequests] Could not fetch MikroTik user status:', mikrotikError.message);
    }

    const enrichedRequests = requests.map((item) => {
      const request = item.toJSON();
      const hotspotUser = hotspotUsersByName.get(request.username);

      return {
        ...request,
        mikrotikExists: !!hotspotUser,
        mikrotikDisabled: hotspotUser ? hotspotUser.disabled : null,
      };
    });

    return res.json(enrichedRequests);
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const baseWhere = buildRequestWhereClause(req.query);
    const total = await UserRequest.count({ where: baseWhere });
    const pending = await UserRequest.count({ where: { ...baseWhere, status: 'pending' } });
    const approved = await UserRequest.count({ where: { ...baseWhere, status: 'approved' } });
    return res.json({ total, pending, approved });
  } catch (error) {
    next(error);
  }
};

exports.getDailySummary = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();

    const endDate = req.query.to ? new Date(req.query.to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = req.query.from ? new Date(req.query.from) : new Date(endDate);
    if (!req.query.from) {
      startDate.setDate(endDate.getDate() - 6);
    }
    startDate.setHours(0, 0, 0, 0);

    const where = buildRequestWhereClause({
      ...req.query,
      from: startDate.toISOString().slice(0, 10),
      to: endDate.toISOString().slice(0, 10),
    });

    const requests = await UserRequest.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);

    const dailyMap = new Map();
    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const key = new Date(cursor).toISOString().slice(0, 10);
      dailyMap.set(key, {
        date: key,
        total: 0,
        approved: 0,
        pending: 0,
      });
    }

    requests.forEach((item) => {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      const bucket = dailyMap.get(key);

      if (bucket) {
        bucket.total += 1;
        if (item.status === 'approved') {
          bucket.approved += 1;
        } else {
          bucket.pending += 1;
        }
      }
    });

    const todayRequests = dailyMap.get(todayKey) || { total: 0, approved: 0, pending: 0 };
    const latestRequest = requests[0];
    const approvedCount = requests.filter((item) => item.status === 'approved').length;
    const pendingCount = requests.filter((item) => item.status === 'pending').length;
    const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

    const previousEnd = new Date(startDate);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (periodDays - 1));
    previousStart.setHours(0, 0, 0, 0);

    const previousWhere = buildRequestWhereClause({
      ...req.query,
      from: previousStart.toISOString().slice(0, 10),
      to: previousEnd.toISOString().slice(0, 10),
    });

    const previousRequests = await UserRequest.findAll({ where: previousWhere });
    const previousApprovedCount = previousRequests.filter((item) => item.status === 'approved').length;
    const previousPendingCount = previousRequests.filter((item) => item.status === 'pending').length;

    const departmentMap = requests.reduce((acc, item) => {
      const key = String(item.department || 'Unknown').trim() || 'Unknown';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    const topDepartments = Array.from(departmentMap.entries())
      .map(([department, total]) => ({ department, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const dailyItems = Array.from(dailyMap.values());
    const peakDay = dailyItems.reduce((best, current) => (
      !best || (current.total || 0) > (best.total || 0) ? current : best
    ), null);

    const calcChange = (current, previous) => {
      if (!previous) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    return res.json({
      summary: {
        totalRequests: requests.length,
        approvedCount,
        pendingCount,
        todayRegistrations: todayRequests.total,
        approvedToday: todayRequests.approved,
        pendingToday: todayRequests.pending,
        latestRequestAt: latestRequest?.createdAt || null,
        latestUsername: latestRequest?.username || null,
        range: {
          from: startDate.toISOString().slice(0, 10),
          to: endDate.toISOString().slice(0, 10),
        },
        trendAnalytics: {
          periodDays,
          approvalRate: requests.length ? Number(((approvedCount / requests.length) * 100).toFixed(1)) : 0,
          pendingRate: requests.length ? Number(((pendingCount / requests.length) * 100).toFixed(1)) : 0,
          dailyAverage: Number((requests.length / periodDays).toFixed(1)),
          peakDay: peakDay?.date || null,
          peakRegistrations: peakDay?.total || 0,
          previousPeriod: {
            totalRequests: previousRequests.length,
            approvedCount: previousApprovedCount,
            pendingCount: previousPendingCount,
            range: {
              from: previousStart.toISOString().slice(0, 10),
              to: previousEnd.toISOString().slice(0, 10),
            },
          },
          changePercent: {
            requests: calcChange(requests.length, previousRequests.length),
            approved: calcChange(approvedCount, previousApprovedCount),
            pending: calcChange(pendingCount, previousPendingCount),
          },
          topDepartments,
        },
      },
      daily: dailyItems,
    });
  } catch (error) {
    next(error);
  }
};

exports.importBatchUsers = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const users = Array.isArray(req.body?.users) ? req.body.users : [];

    if (users.length === 0) {
      return res.status(400).json({ message: 'No users found to import' });
    }

    const imported = [];
    const failed = [];

    for (const rawUser of users) {
      const username = String(rawUser.username || rawUser.name || '').trim();
      const password = String(rawUser.password || '').trim();
      const profile = String(rawUser.profile || 'default').trim() || 'default';
      const comment = String(rawUser.comment || 'Imported from BAT file').trim();
      const fullName = String(rawUser.fullName || username).trim() || username;

      if (!username || !password) {
        failed.push({
          username: username || '(missing username)',
          message: 'Username or password is missing',
        });
        continue;
      }

      try {
        await addHotspotUser({
          name: username,
          password,
          profile,
          comment,
        });

        const existingRequest = await UserRequest.findOne({ where: { username } });
        if (existingRequest) {
          existingRequest.fullName = fullName || existingRequest.fullName;
          existingRequest.password = password;
          existingRequest.profile = profile;
          existingRequest.status = 'approved';
          existingRequest.approvedAt = new Date();
          await existingRequest.save();
        }

        imported.push({
          fullName,
          username,
          password,
          profile,
          comment,
          syncedRequest: !!existingRequest,
        });
      } catch (importError) {
        failed.push({
          username,
          message: importError.message,
        });
      }
    }

    return res.json({
      message: `Imported ${imported.length} user(s) successfully`,
      total: users.length,
      imported,
      failed,
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkApproveRequests = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided for bulk approve' });
    }

    const approved = [];
    const failed = [];

    for (const id of ids) {
      try {
        const request = await UserRequest.findByPk(id);
        if (!request || request.status === 'approved') {
          failed.push({ id, message: !request ? 'Not found' : 'Already approved' });
          continue;
        }
        try {
          await addHotspotUser({
            name: request.username,
            password: request.password,
            profile: request.profile,
            comment: `Bulk approved ${request.username}`,
          });
        } catch (mikrotikErr) {
          console.warn(`[BulkApprove] MikroTik failed for ${request.username}:`, mikrotikErr.message);
        }
        request.status = 'approved';
        request.approvedAt = new Date();
        await request.save();
        approved.push({ id, username: request.username });
      } catch (err) {
        failed.push({ id, message: err.message });
      }
    }

    return res.json({
      message: `Approved ${approved.length} user(s)`,
      approved,
      failed,
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRequest = async (req, res, next) => {  try {
    const UserRequest = getUserRequest();
    const { id } = req.params;
    const request = await UserRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status === 'approved') {
      return res.status(400).json({ message: 'Request already approved' });
    }

    console.log(`[ApproveRequest] Processing request for user: ${request.username}`);
    
    let mikrotikSuccess = false;
    // Try to add hotspot user (optional - continue even if fails)
    try {
      console.log(`[ApproveRequest] Attempting MikroTik add user...`);
      await addHotspotUser({
        name: request.username,
        password: request.password,
        profile: request.profile,
        comment: `Approved user ${request.username}`,
      });
      console.log(`[ApproveRequest] MikroTik operation succeeded`);
      mikrotikSuccess = true;
    } catch (mikrotikError) {
      console.warn(`[ApproveRequest] MikroTik operation failed:`, mikrotikError.message);
      console.warn(`[ApproveRequest] Continuing with database update only`);
      // Continue with database update even if MikroTik fails
    }

    console.log(`[ApproveRequest] Updating database status to approved for user: ${request.username}`);
    request.status = 'approved';
    request.approvedAt = new Date();
    await request.save();

    // Send approval email (non-blocking)
    sendApprovalEmail({
      fullName: request.fullName,
      username: request.username,
      password: request.password,
      email: request.email,
    }).catch(err => console.warn('[ApproveRequest] Email notification failed:', err.message));

    console.log(`[ApproveRequest] Success! User approved and saved to database`);
    return res.json({ 
      ...request.toJSON(),
      mikrotikSuccess 
    });
  } catch (error) {
    console.error('[ApproveRequest Error]:', error);
    next(error);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const { id } = req.params;
    const request = await UserRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status === 'approved') {
      await removeHotspotUser(request.username);
    }

    await request.destroy();
    return res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.cancelApproval = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const { id } = req.params;
    const request = await UserRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved requests can be cancelled' });
    }

    let mikrotikSuccess = false;
    try {
      await removeHotspotUser(request.username);
      console.log(`[MikroTik] Successfully removed user: ${request.username}`);
      mikrotikSuccess = true;
    } catch (mikrotikError) {
      console.warn(`[MikroTik] Warning: Could not remove user from MikroTik:`, mikrotikError.message);
      // Continue with database update even if MikroTik fails
    }
    
    request.status = 'pending';
    request.approvedAt = null;
    await request.save();

    return res.json({ 
      ...request.toJSON(),
      mikrotikSuccess 
    });
  } catch (error) {
    next(error);
  }
};

exports.disableRequestUser = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const { id } = req.params;
    const request = await UserRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved users can be disabled' });
    }

    const success = await disableHotspotUser(request.username);
    if (!success) {
      return res.status(404).json({ message: 'Hotspot user not found in MikroTik' });
    }

    return res.json({
      ...request.toJSON(),
      mikrotikExists: true,
      mikrotikDisabled: true,
      message: 'User disabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.enableRequestUser = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const { id } = req.params;
    const request = await UserRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved users can be enabled' });
    }

    const success = await enableHotspotUser(request.username);
    if (!success) {
      return res.status(404).json({ message: 'Hotspot user not found in MikroTik' });
    }

    return res.json({
      ...request.toJSON(),
      mikrotikExists: true,
      mikrotikDisabled: false,
      message: 'User enabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRequest = async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const { id } = req.params;
    const { fullName, email, password, profile, expiryDate } = req.body;

    const request = await UserRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // อัปเดตข้อมูล
    if (fullName) request.fullName = fullName;
    if (email) request.email = email;
    if (password) request.password = password;
    if (profile) request.profile = profile;
    if (expiryDate !== undefined) request.expiryDate = expiryDate || null;

    await request.save();
    return res.json(request);
  } catch (error) {
    next(error);
  }
};

exports.getProfiles = async (req, res, next) => {
  try {
    console.log('[GetProfiles] Fetching profiles from MikroTik...');
    const profiles = await getHotspotProfiles();
    console.log('[GetProfiles] Profiles fetched successfully:', profiles);
    return res.json(profiles);
  } catch (error) {
    console.error('[GetProfiles] Error:', error.message);
    console.warn('[GetProfiles] Using fallback MikroTik profiles');
    // Return default MikroTik profiles as fallback
    return res.json([
      { name: 'default' },
      { name: 'admin' },
      { name: 'user' }
    ]);
  }
};

// Test endpoint to diagnose MikroTik connectivity
exports.testMikrotik = async (req, res, next) => {
  try {
    console.log('\n[TestMikroTik] ========== MIKROTIK CONNECTION TEST ==========');
    console.log('[TestMikroTik] Testing connection to MikroTik...');
    
    const { RouterOSClient } = require('routeros-client');
    
    const host = process.env.MIKROTIK_HOST;
    const user = process.env.MIKROTIK_USER;
    const password = process.env.MIKROTIK_PASS;
    const port = parseInt(process.env.MIKROTIK_PORT, 10) || 8728;
    
    console.log('[TestMikroTik] Configuration:');
    console.log(`  - Host: ${host}`);
    console.log(`  - Port: ${port}`);
    console.log(`  - User: ${user}`);
    console.log(`  - Timeout: 5 seconds`);
    
    const api = new RouterOSClient({
      host,
      user,
      password,
      port,
      timeout: 5000,
    });

    const connection = await api.connect();
    console.log('[TestMikroTik] ✓ Connection successful!');
    
    // Try to get profiles
    const menu = connection.menu('/ip/hotspot/user/profile');
    const profiles = await menu.find();
    
    console.log('[TestMikroTik] ✓ Profiles fetched successfully');
    console.log('[TestMikroTik] Available profiles:');
    profiles.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name}`);
    });
    
    await connection.close();
    console.log('[TestMikroTik] ✓ Connection closed');
    console.log('[TestMikroTik] =============================================\n');
    
    return res.json({
      success: true,
      message: 'MikroTik connection successful',
      profiles: profiles
    });
  } catch (error) {
    console.error('[TestMikroTik] ✗ Connection failed');
    console.error(`[TestMikroTik] Error: ${error.message}`);
    console.error('[TestMikroTik] =============================================\n');
    
    return res.status(500).json({
      success: false,
      message: 'MikroTik connection failed',
      error: error.message
    });
  }
};

