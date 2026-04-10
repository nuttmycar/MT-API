const express = require('express');
const { getSystemStats, getSystemQuickInfo } = require('../utils/systemInfo');
const { protect, requireAnySectionAccess, requireSectionAccess } = require('../middleware/authMiddleware');
const { getUserRequest } = require('../models/UserRequest');
const { getBackupSchedulerStatus } = require('../utils/backupService');

const router = express.Router();

/**
 * GET /api/system/stats
 * Get full system statistics
 */
router.get('/stats', protect, requireSectionAccess('system'), async (req, res, next) => {
  try {
    const includeProcesses = req.query.includeProcesses === 'true';
    const forceRefresh = req.query.refresh === 'true';

    console.log('[SystemAPI] Fetching full system stats...', { includeProcesses, forceRefresh });
    const stats = await getSystemStats({ includeProcesses, forceRefresh });
    return res.json(stats);
  } catch (error) {
    console.error('[SystemAPI] Error:', error);
    next(error);
  }
});

/**
 * GET /api/system/quick
 * Get quick system overview (CPU, RAM, Uptime only)
 */
router.get('/quick', protect, requireSectionAccess('system'), async (req, res, next) => {
  try {
    console.log('[SystemAPI] Fetching quick system info...');
    const info = await getSystemQuickInfo();
    return res.json(info);
  } catch (error) {
    console.error('[SystemAPI] Error:', error);
    next(error);
  }
});

router.get('/notifications', protect, requireAnySectionAccess('system', 'reports'), async (req, res, next) => {
  try {
    const UserRequest = getUserRequest();
    const pendingApprovals = await UserRequest.count({ where: { status: 'pending' } });
    const quick = await getSystemQuickInfo();
    const backupStatus = await getBackupSchedulerStatus();
    const notifications = [];

    if (pendingApprovals > 0) {
      notifications.push({
        id: 'pending-approvals',
        level: pendingApprovals >= 10 ? 'warning' : 'info',
        title: 'มีผู้ใช้รออนุมัติ',
        message: `ขณะนี้มี ${pendingApprovals} รายการที่รอผู้ดูแลตรวจสอบ`,
      });
    }

    if (!backupStatus.lastRunAt) {
      notifications.push({
        id: 'backup-not-run',
        level: 'warning',
        title: 'Auto backup ยังไม่เคยทำงาน',
        message: 'ระบบสำรองข้อมูลอัตโนมัติเริ่มต้นแล้ว แต่ยังไม่มีไฟล์สำรองล่าสุด',
      });
    }

    if (backupStatus.lastError) {
      notifications.push({
        id: 'backup-error',
        level: 'error',
        title: 'Auto backup พบข้อผิดพลาด',
        message: backupStatus.lastError,
      });
    }

    if ((quick?.cpu || 0) >= 85) {
      notifications.push({
        id: 'cpu-high',
        level: 'warning',
        title: 'CPU ใช้งานสูง',
        message: `CPU กำลังใช้งานประมาณ ${quick.cpu}%`,
      });
    }

    if (notifications.length === 0) {
      notifications.push({
        id: 'all-good',
        level: 'success',
        title: 'ระบบปกติ',
        message: 'ยังไม่พบการแจ้งเตือนสำคัญในขณะนี้',
      });
    }

    return res.json({ notifications, backupStatus, quick });
  } catch (error) {
    console.error('[SystemAPI] Notifications error:', error);
    next(error);
  }
});

module.exports = router;
