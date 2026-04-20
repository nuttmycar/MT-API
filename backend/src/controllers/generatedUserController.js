const { Op } = require('sequelize');
const { getGeneratedUser } = require('../models/GeneratedUser');
const {
  addHotspotUser,
  disableHotspotUser,
  enableHotspotUser,
  removeHotspotUser,
  getHotspotUsers,
} = require('../utils/mikrotik');

// ── List ──────────────────────────────────────────────────────────────────────
exports.listGeneratedUsers = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const { search, status, type, batchLabel, page = 1, limit = 100 } = req.query;

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;
    if (batchLabel && batchLabel !== 'all') where.batchLabel = batchLabel;
    if (search && String(search).trim()) {
      const like = `%${String(search).trim()}%`;
      where[Op.or] = [
        { username: { [Op.like]: like } },
        { fullName: { [Op.like]: like } },
        { comment: { [Op.like]: like } },
        { batchLabel: { [Op.like]: like } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(500, Math.max(1, Number(limit) || 100));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await GeneratedUser.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    // Enrich with live MikroTik status
    let hotspotMap = new Map();
    try {
      const hotspotUsers = await getHotspotUsers();
      hotspotMap = new Map(hotspotUsers.map((u) => [u.name, u]));
    } catch (_) {}

    const data = rows.map((row) => {
      const r = row.toJSON();
      const hs = hotspotMap.get(r.username);
      return {
        ...r,
        mikrotikExists: !!hs,
        mikrotikDisabled: hs ? hs.disabled : null,
      };
    });

    return res.json({ total: count, page: pageNum, limit: limitNum, data });
  } catch (error) {
    next(error);
  }
};

// ── List distinct batch labels ─────────────────────────────────────────────
exports.listBatchLabels = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const rows = await GeneratedUser.findAll({
      attributes: ['batchLabel'],
      where: { batchLabel: { [Op.not]: null } },
      group: ['batchLabel'],
      order: [['batchLabel', 'ASC']],
    });
    return res.json(rows.map((r) => r.batchLabel));
  } catch (error) {
    next(error);
  }
};

// ── Save batch ────────────────────────────────────────────────────────────────
exports.saveBatchGeneratedUsers = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const users = Array.isArray(req.body?.users) ? req.body.users : [];
    const batchLabel = String(req.body?.batchLabel || '').trim() || null;

    if (!users.length) {
      return res.status(400).json({ message: 'No users to save' });
    }

    const saved = [];
    const skipped = [];

    for (const u of users) {
      const username = String(u.username || '').trim();
      const password = String(u.password || '').trim();
      if (!username || !password) {
        skipped.push({ username: username || '(empty)', reason: 'Missing username or password' });
        continue;
      }
      try {
        const userType = String(u.type || req.body?.type || 'generated') === 'imported' ? 'imported' : 'generated';
        const userStatus = (userType === 'imported' && u.mikrotikSynced) ? 'synced' : 'generated';
        const [record, created] = await GeneratedUser.findOrCreate({
          where: { username },
          defaults: {
            username,
            password,
            profile: String(u.profile || 'default').trim(),
            comment: String(u.comment || '').trim() || null,
            fullName: String(u.fullName || username).trim() || null,
            batchLabel,
            type: userType,
            status: userStatus,
            mikrotikSynced: !!u.mikrotikSynced,
          },
        });
        if (!created) {
          // Update password/profile/comment if already exists
          record.password = password;
          record.profile = String(u.profile || record.profile).trim();
          record.comment = String(u.comment || record.comment || '').trim() || null;
          record.fullName = String(u.fullName || record.fullName || username).trim();
          if (batchLabel) record.batchLabel = batchLabel;
          if (u.mikrotikSynced) {
            record.mikrotikSynced = true;
            record.status = 'synced';
          }
          await record.save();
        }
        saved.push(record.toJSON());
      } catch (err) {
        skipped.push({ username, reason: err.message });
      }
    }

    return res.status(201).json({
      message: `Saved ${saved.length} user(s)`,
      saved: saved.length,
      skipped,
    });
  } catch (error) {
    next(error);
  }
};

// ── Update one ────────────────────────────────────────────────────────────────
exports.updateGeneratedUser = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const { id } = req.params;
    const record = await GeneratedUser.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Not found' });

    const { password, profile, comment, fullName, expiryDate, batchLabel } = req.body;

    if (password !== undefined) record.password = String(password).trim();
    if (profile !== undefined) record.profile = String(profile).trim();
    if (comment !== undefined) record.comment = String(comment).trim() || null;
    if (fullName !== undefined) record.fullName = String(fullName).trim() || null;
    if (expiryDate !== undefined) record.expiryDate = expiryDate || null;
    if (batchLabel !== undefined) record.batchLabel = String(batchLabel).trim() || null;

    await record.save();
    return res.json(record.toJSON());
  } catch (error) {
    next(error);
  }
};

// ── Delete one ────────────────────────────────────────────────────────────────
exports.deleteGeneratedUser = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const { id } = req.params;
    const record = await GeneratedUser.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Not found' });
    await record.destroy();
    return res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

// ── Sync one to MikroTik ──────────────────────────────────────────────────────
exports.syncGeneratedUser = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const { id } = req.params;
    const record = await GeneratedUser.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Not found' });

    await addHotspotUser({
      name: record.username,
      password: record.password,
      profile: record.profile,
      comment: record.comment || `Generated user ${record.username}`,
    });

    record.status = 'synced';
    record.mikrotikSynced = true;
    await record.save();
    return res.json({ message: 'Synced to MikroTik', user: record.toJSON() });
  } catch (error) {
    next(error);
  }
};

// ── Sync batch to MikroTik ────────────────────────────────────────────────────
exports.syncBatchGeneratedUsers = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ message: 'No IDs provided' });

    const synced = [];
    const failed = [];

    for (const id of ids) {
      const record = await GeneratedUser.findByPk(id);
      if (!record) { failed.push({ id, reason: 'Not found' }); continue; }
      try {
        await addHotspotUser({
          name: record.username,
          password: record.password,
          profile: record.profile,
          comment: record.comment || `Generated user ${record.username}`,
        });
        record.status = 'synced';
        record.mikrotikSynced = true;
        await record.save();
        synced.push({ id, username: record.username });
      } catch (err) {
        failed.push({ id, username: record.username, reason: err.message });
      }
    }

    return res.json({
      message: `Synced ${synced.length} user(s) to MikroTik`,
      synced,
      failed,
    });
  } catch (error) {
    next(error);
  }
};

// ── Disable on MikroTik ───────────────────────────────────────────────────────
exports.disableGeneratedUser = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const { id } = req.params;
    const record = await GeneratedUser.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Not found' });

    await disableHotspotUser(record.username);
    record.status = 'disabled';
    await record.save();
    return res.json({ message: 'Disabled on MikroTik', user: record.toJSON() });
  } catch (error) {
    next(error);
  }
};

// ── Enable on MikroTik ────────────────────────────────────────────────────────
exports.enableGeneratedUser = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const { id } = req.params;
    const record = await GeneratedUser.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Not found' });

    await enableHotspotUser(record.username);
    record.status = 'synced';
    await record.save();
    return res.json({ message: 'Enabled on MikroTik', user: record.toJSON() });
  } catch (error) {
    next(error);
  }
};

// ── Remove from MikroTik ──────────────────────────────────────────────────────
exports.removeGeneratedUserFromMikrotik = async (req, res, next) => {
  try {
    const GeneratedUser = getGeneratedUser();
    const { id } = req.params;
    const record = await GeneratedUser.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Not found' });

    await removeHotspotUser(record.username);
    record.status = 'removed';
    record.mikrotikSynced = false;
    await record.save();
    return res.json({ message: 'Removed from MikroTik', user: record.toJSON() });
  } catch (error) {
    next(error);
  }
};
