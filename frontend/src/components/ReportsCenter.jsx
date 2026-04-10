import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000/api`;

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      searchParams.set(key, value);
    }
  });
  return searchParams.toString();
};

const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
};

const noticeStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

export default function ReportsCenter({ token, showAlert, userRole = 'super_admin', permissions = {} }) {
  const [reportLoading, setReportLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [backupStatus, setBackupStatus] = useState({ intervalHours: 24, recentFiles: [] });
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    status: 'all',
    department: '',
    position: '',
  });
  const [dailySummaryInfo, setDailySummaryInfo] = useState({
    totalRequests: 0,
    approvedCount: 0,
    pendingCount: 0,
    todayRegistrations: 0,
    approvedToday: 0,
    pendingToday: 0,
    latestRequestAt: null,
    latestUsername: null,
    range: { from: '', to: '' },
  });

  const reportActions = permissions?.actions?.reports || {};
  const hasReportSection = typeof permissions?.reports === 'boolean' ? permissions.reports : true;
  const canManageBackups = hasReportSection && (reportActions.backup ?? ['super_admin', 'admin'].includes(userRole));
  const canExportReports = hasReportSection && (reportActions.export ?? ['super_admin', 'admin'].includes(userRole));

  useEffect(() => {
    if (token) {
      refreshAll();
    }
  }, [token]);

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const fetchDailySummary = async (currentFilters = filters) => {
    const query = buildQueryString(currentFilters);
    const response = await fetch(`${API_BASE}/requests/daily-summary${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'โหลดรายงานสรุปไม่สำเร็จ');
    }

    setDailySummary(data.daily || []);
    setDailySummaryInfo((prev) => ({ ...prev, ...(data.summary || {}) }));
  };

  const fetchAuditLogs = async (currentFilters = filters) => {
    setAuditLoading(true);
    try {
      const query = buildQueryString({
        from: currentFilters.from,
        to: currentFilters.to,
        limit: 40,
      });
      const response = await fetch(`${API_BASE}/settings/audit-logs${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'โหลด Audit Log ไม่สำเร็จ');
      }

      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Reports] Error fetching audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'โหลดการแจ้งเตือนไม่สำเร็จ');
      }

      setNotifications(data.notifications || []);
      if (data.backupStatus) {
        setBackupStatus(data.backupStatus);
      }
    } catch (error) {
      console.error('[Reports] Error fetching notifications:', error);
    }
  };

  const fetchBackupStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/backup/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setBackupStatus(data || {});
      }
    } catch (error) {
      console.error('[Reports] Error fetching backup status:', error);
    }
  };

  const refreshAll = async (currentFilters = filters) => {
    setReportLoading(true);
    try {
      await Promise.all([
        fetchDailySummary(currentFilters),
        fetchAuditLogs(currentFilters),
        fetchNotifications(),
        fetchBackupStatus(),
      ]);
    } catch (error) {
      showAlert(error.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    await refreshAll(filters);
  };

  const handleClearFilters = async () => {
    const resetFilters = {
      from: '',
      to: '',
      status: 'all',
      department: '',
      position: '',
    };
    setFilters(resetFilters);
    await refreshAll(resetFilters);
  };

  const handleBackupSettings = async () => {
    setReportLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/backup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Backup failed');

      const fileName = `mt-api-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(JSON.stringify(data, null, 2), fileName, 'application/json;charset=utf-8');
      showAlert('✓ Backup settings สำเร็จ');
      await fetchBackupStatus();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleManualBackup = async () => {
    if (!canManageBackups) {
      showAlert('สิทธิ์ Viewer ไม่สามารถสั่ง Backup/Restore ได้');
      return;
    }

    setReportLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/backup/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Manual backup failed');

      showAlert(`✓ ${result.fileName} ถูกสร้างแล้ว`);
      await fetchBackupStatus();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleRestoreSettings = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!canManageBackups) {
      showAlert('สิทธิ์ Viewer ไม่สามารถสั่ง Backup/Restore ได้');
      event.target.value = '';
      return;
    }

    setRestoreLoading(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      const response = await fetch(`${API_BASE}/settings/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(backupData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Restore failed');

      showAlert('✓ Restore settings สำเร็จแล้ว');
      await refreshAll(filters);
    } catch (error) {
      showAlert(error.message || 'Restore failed');
    } finally {
      event.target.value = '';
      setRestoreLoading(false);
    }
  };

  const handleExportUserReport = async (format = 'csv') => {
    if (!canExportReports) {
      showAlert('สิทธิ์ของ role นี้ยังไม่สามารถ Export รายงานได้');
      return;
    }

    setReportLoading(true);
    try {
      const query = buildQueryString(filters);
      const response = await fetch(`${API_BASE}/requests${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Report export failed');

      const rows = Array.isArray(data) ? data : [];
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

      if (format === 'json') {
        downloadFile(JSON.stringify(rows, null, 2), `user-report-${stamp}.json`, 'application/json;charset=utf-8');
      } else {
        const headers = ['Full Name', 'Username', 'Email', 'Profile', 'Position', 'Department', 'Status', 'Created At'];
        const csvRows = [headers, ...rows.map((item) => ([
          item.fullName,
          item.username,
          item.email,
          item.profile,
          item.position,
          item.department,
          item.status,
          item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '',
        ]))];

        const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csvContent = `\uFEFF${csvRows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`;
        downloadFile(csvContent, `user-report-${stamp}.csv`, 'text/csv;charset=utf-8');
      }

      showAlert(`✓ Export รายงานผู้ใช้งานเป็น ${format.toUpperCase()} สำเร็จ`);
    } catch (error) {
      showAlert(error.message);
    } finally {
      setReportLoading(false);
    }
  };

  const maxDailyTotal = Math.max(1, ...dailySummary.map((item) => item.total || 0));
  const trendAnalytics = dailySummaryInfo.trendAnalytics || {};

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 shadow-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Reports • Audit • Notifications</p>
            <h2 className="mt-2 text-3xl font-bold text-white">รายงาน, สำรองข้อมูล และสถิติรายวัน</h2>
            <p className="mt-2 text-slate-300">รวมระบบ Audit Log, สิทธิ์การใช้งาน, การแจ้งเตือน และ Auto Backup ไว้ที่จอเดียว</p>
          </div>
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            ระดับสิทธิ์ปัจจุบัน: <span className="font-bold">{roleLabels[userRole] || 'Guest'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">🔎 Filter รายงาน</h3>
            <p className="mt-1 text-sm text-slate-500">กรองตามวันที่, สถานะ, ตำแหน่ง และแผนก เพื่อใช้กับสรุปและ export</p>
          </div>
          <div className="text-xs text-slate-500">
            ช่วงข้อมูลล่าสุด: {dailySummaryInfo.range?.from || '-'} ถึง {dailySummaryInfo.range?.to || '-'}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">จากวันที่</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">ถึงวันที่</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">สถานะ</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">แผนก</span>
            <input
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              placeholder="เช่น IT"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">ตำแหน่ง</span>
            <input
              value={filters.position}
              onChange={(e) => setFilters({ ...filters, position: e.target.value })}
              placeholder="เช่น Manager"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={reportLoading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {reportLoading ? 'กำลังโหลด...' : 'ใช้ตัวกรอง'}
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={reportLoading}
            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300 disabled:bg-slate-100"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notifications.map((item) => (
          <div key={item.id} className={`rounded-2xl border p-4 shadow-sm ${noticeStyles[item.level] || noticeStyles.info}`}>
            <p className="text-sm font-bold">{item.title}</p>
            <p className="mt-1 text-sm">{item.message}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-700 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">สมัครวันนี้</p>
          <p className="mt-2 text-3xl font-bold">{dailySummaryInfo.todayRegistrations || 0}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">อนุมัติวันนี้</p>
          <p className="mt-2 text-3xl font-bold">{dailySummaryInfo.approvedToday || 0}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">รออนุมัติ</p>
          <p className="mt-2 text-3xl font-bold">{dailySummaryInfo.pendingCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">ผู้ใช้ทั้งหมด</p>
          <p className="mt-2 text-3xl font-bold">{dailySummaryInfo.totalRequests || 0}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-black">📈 Charts + Trend Analytics</h3>
              <p className="mt-1 text-sm text-gray-500">วิเคราะห์แนวโน้มการสมัครและการอนุมัติเทียบกับช่วงก่อนหน้า</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              Approval Rate {trendAnalytics.approvalRate || 0}%
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-xs text-cyan-700">เฉลี่ยต่อวัน</p>
              <p className="mt-2 text-2xl font-bold text-cyan-950">{trendAnalytics.dailyAverage || 0}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs text-violet-700">Peak Day</p>
              <p className="mt-2 text-lg font-bold text-violet-950">{trendAnalytics.peakDay || '-'}</p>
              <p className="text-xs text-violet-700">{trendAnalytics.peakRegistrations || 0} registrations</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">เทียบช่วงก่อนหน้า</p>
              <p className={`mt-2 text-2xl font-bold ${(trendAnalytics.changePercent?.requests || 0) >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                {(trendAnalytics.changePercent?.requests || 0) >= 0 ? '+' : ''}{trendAnalytics.changePercent?.requests || 0}%
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-700">ช่วงก่อนหน้า</p>
              <p className="mt-2 text-2xl font-bold text-amber-950">{trendAnalytics.previousPeriod?.totalRequests || 0}</p>
              <p className="text-xs text-amber-700">requests</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {dailySummary.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีข้อมูลกราฟในช่วงที่เลือก</p>
            ) : (
              <div className="space-y-4">
                <div className="flex h-48 items-end gap-2">
                  {dailySummary.map((item) => {
                    const totalHeight = Math.max(10, Math.round(((item.total || 0) / maxDailyTotal) * 100));
                    const approvedHeight = item.total ? Math.max(6, Math.round(((item.approved || 0) / maxDailyTotal) * 100)) : 0;

                    return (
                      <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-40 w-full items-end justify-center gap-1 rounded-xl bg-white px-1 py-2 ring-1 ring-slate-200">
                          <div className="w-3 rounded-full bg-slate-300" style={{ height: `${totalHeight}%` }} title={`Total ${item.total}`} />
                          <div className="w-3 rounded-full bg-emerald-500" style={{ height: `${approvedHeight}%` }} title={`Approved ${item.approved}`} />
                        </div>
                        <span className="text-[11px] text-slate-600">{item.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-300" /> Total</span>
                  <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Approved</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h3 className="text-2xl font-bold text-black">🏢 Top Departments</h3>
          <p className="mt-1 text-sm text-gray-500">แผนกที่มีการลงทะเบียนมากที่สุดในช่วงเวลาที่กรองไว้</p>

          <div className="mt-5 space-y-3">
            {(trendAnalytics.topDepartments || []).length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีข้อมูลแผนกสำหรับการวิเคราะห์</p>
            ) : (
              (trendAnalytics.topDepartments || []).map((item) => {
                const percent = Math.max(8, Math.round((item.total / Math.max(1, (trendAnalytics.topDepartments || [])[0]?.total || 1)) * 100));
                return (
                  <div key={item.department}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{item.department}</span>
                      <span className="text-slate-500">{item.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h3 className="text-2xl font-bold text-black">📦 Backup / Restore Settings</h3>
          <p className="mt-1 text-sm text-gray-500">รองรับ Auto Backup, สั่ง backup ทันที, ดาวน์โหลดไฟล์ และ restore กลับเข้าระบบ</p>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold">Auto Backup:</span> ทุก {backupStatus.intervalHours || 24} ชั่วโมง</p>
            <p><span className="font-semibold">รันล่าสุด:</span> {backupStatus.lastRunAt ? new Date(backupStatus.lastRunAt).toLocaleString('th-TH') : 'ยังไม่มี'}</p>
            <p><span className="font-semibold">ไฟล์ล่าสุด:</span> {backupStatus.lastFile || '-'}</p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleBackupSettings}
              disabled={reportLoading || restoreLoading}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:bg-gray-400"
            >
              ⬇️ Download Backup
            </button>
            <button
              type="button"
              onClick={handleManualBackup}
              disabled={!canManageBackups || reportLoading || restoreLoading}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:bg-gray-300 disabled:text-gray-500"
            >
              ⚡ Run Auto Backup Now
            </button>
          </div>

          <label className={`mt-3 block cursor-pointer rounded-xl px-4 py-3 text-center font-semibold text-white transition ${restoreLoading ? 'bg-gray-400' : 'bg-violet-600 hover:bg-violet-700'}`}>
            {restoreLoading ? 'กำลัง restore...' : '♻️ Restore Settings'}
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleRestoreSettings}
              className="hidden"
              disabled={restoreLoading || reportLoading || !canManageBackups}
            />
          </label>

          <div className="mt-4 text-xs text-slate-500">
            ไฟล์ล่าสุด: {(backupStatus.recentFiles || []).slice(0, 4).join(', ') || 'ยังไม่มี'}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h3 className="text-2xl font-bold text-black">📄 Export รายงานผู้ใช้งาน</h3>
          <p className="mt-1 text-sm text-gray-500">ส่งออกรายงานผู้ใช้งานทั้งหมดตามตัวกรองที่ตั้งไว้เป็นไฟล์ CSV หรือ JSON</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleExportUserReport('csv')}
              disabled={reportLoading || !canExportReports}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-gray-400"
            >
              📊 Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExportUserReport('json')}
              disabled={reportLoading || !canExportReports}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
            >
              🧾 Export JSON
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">ฟีเจอร์ใหม่ที่เพิ่มแล้ว</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Audit Log สำหรับการอนุมัติ, ลบ, import, backup/restore</li>
              <li>Role / Permission แยก `Super Admin`, `Admin`, `Viewer`</li>
              <li>Notification Center แจ้ง pending approvals และสถานะ backup</li>
              <li>Auto Backup Scheduler พร้อมปุ่มสั่งรันได้ทันที</li>
              <li>Filter รายงานตามช่วงวันที่และสถานะ</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-black">🧾 Audit Log</h3>
            <p className="mt-1 text-sm text-gray-500">บันทึกเหตุการณ์สำคัญ เช่น approve, delete, import, backup และ restore</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {auditLoading ? 'กำลังโหลด...' : `${auditLogs.length} events`}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                <th className="px-3 py-2">เวลา</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">ประเภท</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 py-4 text-center text-gray-500">ยังไม่มี Audit Log</td>
                </tr>
              ) : (
                auditLogs.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'}</td>
                    <td className="px-3 py-2 font-semibold">{item.action}</td>
                    <td className="px-3 py-2">{item.actorUsername} ({item.actorRole})</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : item.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{item.entityType}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-black">📈 Dashboard สรุปสถิติรายวัน</h3>
            <p className="mt-1 text-sm text-gray-500">สรุปการลงทะเบียนและการอนุมัติตามช่วงเวลาที่เลือก</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            ล่าสุด: {dailySummaryInfo.latestUsername || '-'}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {dailySummary.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีข้อมูลสถิติรายวันในช่วงที่เลือก</p>
          ) : (
            dailySummary.map((item) => {
              const totalPercent = Math.max(6, Math.round(((item.total || 0) / maxDailyTotal) * 100));
              const approvedPercent = item.total ? Math.max(6, Math.round(((item.approved || 0) / maxDailyTotal) * 100)) : 0;

              return (
                <div key={item.date} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{item.date}</span>
                    <span className="text-slate-600">รวม {item.total} | อนุมัติ {item.approved} | รอ {item.pending}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${totalPercent}%` }} />
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${approvedPercent}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
