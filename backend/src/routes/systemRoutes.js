const express = require('express');
const { getSystemStats, getSystemQuickInfo } = require('../utils/systemInfo');
const { protect, requireAnySectionAccess, requireActionAccess } = require('../middleware/authMiddleware');
const { getUserRequest } = require('../models/UserRequest');
const { getBackupSchedulerStatus } = require('../utils/backupService');
const { maybeDispatchSystemAlerts } = require('../utils/alertService');
const { getMikrotikStatus } = require('../utils/mikrotik');

const router = express.Router();

/**
 * GET /api/system/stats
 * Get full system statistics
 */
router.get('/stats', protect, requireActionAccess('system', 'view'), async (req, res, next) => {
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
router.get('/quick', protect, requireActionAccess('system', 'view'), async (req, res, next) => {
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

    // Check MikroTik connectivity
    try {
      const mtStatus = await getMikrotikStatus();
      if (!mtStatus?.connected) {
        notifications.push({
          id: 'mikrotik-offline',
          level: 'error',
          title: 'MikroTik ไม่ตอบสนอง',
          message: 'ไม่สามารถเชื่อมต่อกับ MikroTik Router ได้ในขณะนี้',
        });
      }
    } catch {
      notifications.push({
        id: 'mikrotik-offline',
        level: 'error',
        title: 'MikroTik ไม่ตอบสนอง',
        message: 'ไม่สามารถเชื่อมต่อกับ MikroTik Router ได้ในขณะนี้',
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

    let alertDispatch = { sent: false, skipped: true, reason: 'Not evaluated' };
    try {
      alertDispatch = await maybeDispatchSystemAlerts({ notifications, pendingApprovals, quick });
    } catch (dispatchError) {
      console.error('[SystemAPI] Alert dispatch error:', dispatchError.message);
      alertDispatch = { sent: false, skipped: true, reason: dispatchError.message };
    }

    return res.json({ notifications, backupStatus, quick, alertDispatch });
  } catch (error) {
    console.error('[SystemAPI] Notifications error:', error);
    next(error);
  }
});

module.exports = router;
