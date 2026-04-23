import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000/api`;

const DEFAULT_REGISTRATION_CONSENT = {
  enabled: true,
  title: 'เงื่อนไขการใช้งานระบบเครือข่ายและการคุ้มครองข้อมูลส่วนบุคคล',
  content: [
    '1) ผู้ขอใช้งานยินยอมปฏิบัติตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ และข้อกำหนดของหน่วยงาน',
    '2) ระบบอาจมีการบันทึกข้อมูลการใช้งาน (Log) เพื่อความมั่นคงปลอดภัย การตรวจสอบย้อนหลัง และการปฏิบัติตามกฎหมาย',
    '3) ข้อมูลส่วนบุคคลที่เก็บจะถูกใช้เพื่อการยืนยันตัวตน การอนุมัติสิทธิ์ใช้งาน และการดูแลระบบเท่านั้น',
    '4) ห้ามนำระบบไปใช้ในทางที่ผิดกฎหมาย กระทบต่อความมั่นคง หรือรบกวนผู้ใช้งานอื่น',
    '5) ผู้ใช้งานควรเก็บรักษาชื่อผู้ใช้และรหัสผ่านเป็นความลับ และแจ้งผู้ดูแลเมื่อพบเหตุผิดปกติ',
  ].join('\n'),
  checkboxLabel: 'ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขการใช้งาน รวมถึงการเก็บและใช้ข้อมูลส่วนบุคคลตามที่กำหนด',
  requireAccuracyConfirmation: true,
  accuracyLabel: 'ข้าพเจ้ารับรองว่าข้อมูลที่กรอกเป็นจริงและยินยอมให้ตรวจสอบเพื่ออนุมัติสิทธิ์ใช้งาน',
};

const DEFAULT_APP_BRANDING = {
  appName: 'MT-API',
  appSubtitle: 'MikroTik Hotspot Management System',
  browserTitle: 'MT API Dashboard',
  dashboardTitle: 'MT-API Dashboard',
  dashboardSubtitle: 'ระบบจัดการ MikroTik Hotspot พร้อมรายงานและงานอัตโนมัติ',
  footerText: '© 2026 MT-API — B&B Computer Service -- Dream Team Network Solution',
  logoUrl: '',
  faviconUrl: '',
};

const DEFAULT_COUPON_SETTINGS = {
  loginUrl: 'http://192.168.10.1/login',
  brandName: 'MT-API HOTSPOT',
  couponTitle: 'Internet Coupon Slip',
};

const DEFAULT_ALERT_CONFIG = {
  enabled: false,
  coolDownMinutes: 15,
  triggers: {
    pendingApprovals: true,
    pendingThreshold: 5,
    cpuHigh: true,
    cpuThreshold: 85,
    backupError: true,
  },
  channels: {
    line: {
      enabled: false,
      token: '',
    },
    telegram: {
      enabled: false,
      botToken: '',
      chatId: '',
    },
  },
};

export default function Settings({ token, showAlert, onBrandingChange, permissions = {} }) {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionDesc, setNewPositionDesc] = useState('');
  const [editPositionId, setEditPositionId] = useState(null);
  const [editPositionPayload, setEditPositionPayload] = useState({ name: '', description: '' });
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDesc, setNewDepartmentDesc] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState(null);
  const [editDepartmentPayload, setEditDepartmentPayload] = useState({ name: '', description: '' });
  const [registrationCode, setRegistrationCode] = useState('');
  const [registrationConsent, setRegistrationConsent] = useState(DEFAULT_REGISTRATION_CONSENT);
  const [brandingConfig, setBrandingConfig] = useState(DEFAULT_APP_BRANDING);
  const [couponSettings, setCouponSettings] = useState(DEFAULT_COUPON_SETTINGS);
  const [codeLoading, setCodeLoading] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [databaseConfig, setDatabaseConfig] = useState({
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
  });
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState([]);
  const [dailySummaryInfo, setDailySummaryInfo] = useState({
    totalRequests: 0,
    approvedCount: 0,
    pendingCount: 0,
    todayRegistrations: 0,
    approvedToday: 0,
    pendingToday: 0,
    latestRequestAt: null,
    latestUsername: null,
  });
  const [mikrotikConfig, setMikrotikConfig] = useState({
    ip: '',
    port: 8728,
    username: '',
    password: '',
    os_version: 'v7'
  });
  const [mikrotikLoading, setMikrotikLoading] = useState(false);
  const [mikrotikStatus, setMikrotikStatus] = useState(null);
  const [alertConfig, setAlertConfig] = useState(DEFAULT_ALERT_CONFIG);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertTestLoading, setAlertTestLoading] = useState(false);
  const [alertTestResult, setAlertTestResult] = useState(null);
  const [emailConfig, setEmailConfig] = useState({
    host: '', port: 587, secure: false, user: '', password: '',
    fromName: '', fromAddress: '', notifyOnApprove: true,
    subjectTemplate: 'บัญชี Hotspot ของคุณพร้อมใช้งานแล้ว',
    bodyTemplate: 'สวัสดี {{fullName}},\n\nบัญชีของคุณได้รับการอนุมัติแล้ว\nUsername: {{username}}\nPassword: {{password}}\n\nขอบคุณ',
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);

  const settingsActions = permissions?.actions?.settings || {};
  const hasSettingsSection = typeof permissions?.settings === 'boolean' ? permissions.settings : true;
  const canUpdateSettings = hasSettingsSection && (settingsActions.update ?? true);
  const canTestSettings = hasSettingsSection && (settingsActions.test ?? canUpdateSettings);

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
    fetchRegistrationCode();
    fetchRegistrationConsent();
    fetchBrandingConfig();
    fetchCouponSettings();
    fetchDatabaseConfig();
    fetchDailySummary();
    fetchMikrotikConfig();
    fetchAlertConfig();
    fetchEmailConfig();
  }, []);

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

  const fetchBrandingConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/branding`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setBrandingConfig({ ...DEFAULT_APP_BRANDING, ...data });
      }
    } catch (error) {
      console.error('[Branding] Error fetching config:', error);
    }
  };

  const handleBrandingLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 40 * 1024) {
      showAlert('กรุณาใช้ไฟล์โลโก้ขนาดไม่เกินประมาณ 40 KB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBrandingConfig((prev) => ({ ...prev, logoUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleFaviconUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024) {
      showAlert('กรุณาใช้ไฟล์ favicon ขนาดไม่เกินประมาณ 20 KB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBrandingConfig((prev) => ({ ...prev, faviconUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveBranding = async (event) => {
    event.preventDefault();

    if (!brandingConfig.appName.trim()) {
      showAlert('กรุณากรอกชื่อระบบ');
      return;
    }

    setBrandingLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/branding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(brandingConfig),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update branding');

      const nextBranding = { ...DEFAULT_APP_BRANDING, ...(data.branding || brandingConfig) };
      setBrandingConfig(nextBranding);
      if (typeof onBrandingChange === 'function') {
        onBrandingChange(nextBranding);
      }
      showAlert('✓ บันทึกข้อความและ Logo ของระบบแล้ว');
    } catch (error) {
      showAlert(error.message);
    } finally {
      setBrandingLoading(false);
    }
  };

  const fetchCouponSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/coupon`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setCouponSettings({ ...DEFAULT_COUPON_SETTINGS, ...data });
      }
    } catch (error) {
      console.error('[CouponSettings] Error fetching config:', error);
    }
  };

  const handleSaveCouponSettings = async (event) => {
    event.preventDefault();

    if (!couponSettings.loginUrl.trim()) {
      showAlert('กรุณากรอก Hotspot Login URL');
      return;
    }

    if (!couponSettings.brandName.trim()) {
      showAlert('กรุณากรอกชื่อแบรนด์บนคูปอง');
      return;
    }

    if (!couponSettings.couponTitle.trim()) {
      showAlert('กรุณากรอกหัวข้อบนคูปอง');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(couponSettings),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update coupon settings');

      const nextSettings = { ...DEFAULT_COUPON_SETTINGS, ...(data.couponSettings || couponSettings) };
      setCouponSettings(nextSettings);
      showAlert('✓ บันทึกการตั้งค่าคูปองเรียบร้อยแล้ว');
    } catch (error) {
      showAlert(error.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/requests/daily-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        setDailySummary(data.daily || []);
        setDailySummaryInfo(data.summary || {});
      }
    } catch (error) {
      console.error('[Settings] Error fetching daily summary:', error);
    }
  };

  const fetchAlertConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAlertConfig({
          ...DEFAULT_ALERT_CONFIG,
          ...data,
          triggers: { ...DEFAULT_ALERT_CONFIG.triggers, ...(data.triggers || {}) },
          channels: {
            line: { ...DEFAULT_ALERT_CONFIG.channels.line, ...(data.channels?.line || {}) },
            telegram: { ...DEFAULT_ALERT_CONFIG.channels.telegram, ...(data.channels?.telegram || {}) },
          },
        });
      }
    } catch (error) {
      console.error('[Settings] Error fetching alert config:', error);
    }
  };

  const handleSaveAlertConfig = async (event) => {
    event.preventDefault();

    if (!canUpdateSettings) {
      showAlert('สิทธิ์ของ role นี้ยังไม่สามารถแก้ไข Alert Settings ได้');
      return;
    }

    setAlertLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(alertConfig),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save alert settings');

      setAlertConfig({
        ...DEFAULT_ALERT_CONFIG,
        ...(data.config || alertConfig),
        triggers: { ...DEFAULT_ALERT_CONFIG.triggers, ...((data.config || alertConfig).triggers || {}) },
        channels: {
          line: { ...DEFAULT_ALERT_CONFIG.channels.line, ...((data.config || alertConfig).channels?.line || {}) },
          telegram: { ...DEFAULT_ALERT_CONFIG.channels.telegram, ...((data.config || alertConfig).channels?.telegram || {}) },
        },
      });
      showAlert('✓ บันทึกการตั้งค่า LINE/Telegram alerts แล้ว');
    } catch (error) {
      showAlert(error.message);
    } finally {
      setAlertLoading(false);
    }
  };

  const handleSendAlertTest = async () => {
    if (!canTestSettings) {
      showAlert('สิทธิ์ของ role นี้ยังไม่สามารถทดสอบ Alert ได้');
      return;
    }

    setAlertTestLoading(true);
    setAlertTestResult(null);
    try {
      const response = await fetch(`${API_BASE}/settings/alerts/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: `✅ MT-API test alert @ ${new Date().toLocaleString('th-TH')}`,
          config: alertConfig,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send test alert');

      setAlertTestResult(data);
      showAlert(data.success ? '✓ ส่ง Test Alert แล้ว' : 'ℹ️ ยังไม่ได้ส่งจริง กรุณาตรวจสอบ token/chat id');
    } catch (error) {
      showAlert(error.message);
      setAlertTestResult({ success: false, message: error.message });
    } finally {
      setAlertTestLoading(false);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/email`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data) {
        setEmailConfig((prev) => ({ ...prev, ...data, password: '' }));
      }
    } catch (error) {
      console.error('[Settings] Error fetching email config:', error);
    }
  };

  const handleSaveEmailConfig = async (event) => {
    event.preventDefault();
    if (!canUpdateSettings) { showAlert('สิทธิ์ของ role นี้ยังไม่สามารถแก้ไข Email Settings ได้'); return; }
    setEmailLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(emailConfig),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save email settings');
      showAlert('✓ บันทึกการตั้งค่า Email แล้ว');
      fetchEmailConfig();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!canTestSettings) { showAlert('สิทธิ์ของ role นี้ยังไม่สามารถทดสอบ Email ได้'); return; }
    setEmailTestLoading(true);
    setEmailTestResult(null);
    try {
      const response = await fetch(`${API_BASE}/settings/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(emailConfig),
      });
      const data = await response.json();
      setEmailTestResult({ success: response.ok, message: data.message || (response.ok ? 'ส่งสำเร็จ' : 'ส่งล้มเหลว') });
    } catch (error) {
      setEmailTestResult({ success: false, message: error.message });
    } finally {
      setEmailTestLoading(false);
    }
  };

  const handleBackupSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/backup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Backup failed');

      const fileName = `mt-api-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(JSON.stringify(data, null, 2), fileName, 'application/json;charset=utf-8');
      showAlert('✓ Backup settings สำเร็จ');
    } catch (error) {
      showAlert(error.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleRestoreSettings = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      fetchPositions();
      fetchDepartments();
      fetchRegistrationCode();
      fetchRegistrationConsent();
      fetchBrandingConfig();
      fetchDatabaseConfig();
      fetchMikrotikConfig();
      fetchDailySummary();
    } catch (error) {
      showAlert(error.message || 'Restore failed');
    } finally {
      event.target.value = '';
      setRestoreLoading(false);
    }
  };

  const handleExportUserReport = async (format = 'csv') => {
    setReportLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requests`, {
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

  const fetchPositions = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Settings-Frontend] Positions response status:', response.status);
      console.log('[Settings-Frontend] Positions response headers:', {
        'content-type': response.headers.get('content-type'),
      });
      const data = await response.json();
      console.log('[Settings-Frontend] Fetched positions:', data);
      console.log('[Settings-Frontend] Positions as string:', JSON.stringify(data));
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      showAlert('Error loading positions');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      showAlert('Error loading departments');
    }
  };

  const handleAddPosition = async (e) => {
    e.preventDefault();
    if (!newPositionName.trim()) {
      showAlert('Position name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPositionName,
          description: newPositionDesc,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to add position');
      }

      setNewPositionName('');
      setNewPositionDesc('');
      showAlert('✓ Position added successfully');
      fetchPositions();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) {
      showAlert('Department name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDepartmentName,
          description: newDepartmentDesc,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to add department');
      }

      setNewDepartmentName('');
      setNewDepartmentDesc('');
      showAlert('✓ Department added successfully');
      fetchDepartments();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditPosition = (position) => {
    setEditPositionId(position.id);
    setEditPositionPayload({
      name: position.name || '',
      description: position.description || '',
    });
  };

  const handleSavePosition = async () => {
    if (!editPositionPayload.name.trim()) {
      showAlert('Position name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/positions/${editPositionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editPositionPayload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update position');

      showAlert('✓ แก้ไขตำแหน่งเรียบร้อยแล้ว');
      setEditPositionId(null);
      setEditPositionPayload({ name: '', description: '' });
      fetchPositions();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePosition = async (id) => {
    if (!window.confirm('Delete this position?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/positions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete position');

      showAlert('✓ Position deleted');
      fetchPositions();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditDepartment = (department) => {
    setEditDepartmentId(department.id);
    setEditDepartmentPayload({
      name: department.name || '',
      description: department.description || '',
    });
  };

  const handleSaveDepartment = async () => {
    if (!editDepartmentPayload.name.trim()) {
      showAlert('Department name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/departments/${editDepartmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editDepartmentPayload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update department');

      showAlert('✓ แก้ไขแผนกเรียบร้อยแล้ว');
      setEditDepartmentId(null);
      setEditDepartmentPayload({ name: '', description: '' });
      fetchDepartments();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Delete this department?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete department');

      showAlert('✓ Department deleted');
      fetchDepartments();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/database`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        setDatabaseConfig({
          host: data.host || 'localhost',
          port: data.port || 3306,
          database: data.database || '',
          username: data.username || '',
          password: data.password || '',
        });
      }
    } catch (error) {
      console.error('[Database] Error fetching config:', error);
    }
  };

  const handleUpdateDatabaseConfig = async (e) => {
    e.preventDefault();

    if (!databaseConfig.host || !databaseConfig.database || !databaseConfig.username) {
      showAlert('กรุณากรอก Host, Database และ Username');
      return;
    }

    setDatabaseLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(databaseConfig),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update database settings');

      showAlert('✓ บันทึกค่าการเชื่อมต่อ MariaDB แล้ว (อาจต้อง restart backend)');
      setDatabaseStatus({ success: true, message: 'บันทึกค่าการเชื่อมต่อเรียบร้อยแล้ว' });
      fetchDatabaseConfig();
    } catch (error) {
      showAlert(error.message);
      setDatabaseStatus({ success: false, message: error.message });
    } finally {
      setDatabaseLoading(false);
    }
  };

  const handleTestDatabaseConnection = async () => {
    setDatabaseLoading(true);
    setDatabaseStatus(null);

    try {
      const response = await fetch(`${API_BASE}/settings/database/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(databaseConfig),
      });

      const data = await response.json();
      setDatabaseStatus({
        success: !!data.success,
        message: data.message,
        info: data.info,
      });

      if (!response.ok) {
        throw new Error(data.message || 'Database connection test failed');
      }

      showAlert('✓ ทดสอบการเชื่อมต่อ MariaDB สำเร็จ');
    } catch (error) {
      showAlert(error.message);
    } finally {
      setDatabaseLoading(false);
    }
  };

  const fetchRegistrationConsent = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/registration-consent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setRegistrationConsent({ ...DEFAULT_REGISTRATION_CONSENT, ...data });
      }
    } catch (error) {
      console.error('[Settings-Consent] Error fetching consent:', error);
    }
  };

  const handleUpdateRegistrationConsent = async (event) => {
    event.preventDefault();

    if (!registrationConsent.title.trim() || !registrationConsent.content.trim() || !registrationConsent.checkboxLabel.trim()) {
      showAlert('กรุณากรอกหัวข้อ รายละเอียด และข้อความ checkbox ให้ครบ');
      return;
    }

    setConsentLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/registration-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(registrationConsent),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update registration consent');

      showAlert('✓ บันทึกเงื่อนไขการใช้งาน / PDPA เรียบร้อยแล้ว');
      fetchRegistrationConsent();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setConsentLoading(false);
    }
  };

  const fetchRegistrationCode = async () => {
    try {
      console.log('[Settings-RegCode] Fetching current code from:', `${API_BASE}/settings/registration-code`);
      const response = await fetch(`${API_BASE}/settings/registration-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Settings-RegCode] Fetch response status:', response.status);
      const data = await response.json();
      console.log('[Settings-RegCode] Fetched data:', data);
      if (response.ok) {
        console.log('[Settings-RegCode] ✓ Code fetched:', data.code);
        setRegistrationCode(data.code || '');
      } else {
        console.error('[Settings-RegCode] ❌ Fetch error:', data);
      }
    } catch (error) {
      console.error('[Settings-RegCode] ❌ Error fetching registration code:', error);
    }
  };

  const handleUpdateRegistrationCode = async (e) => {
    e.preventDefault();
    
    console.log('[Settings-RegCode] Starting update with code:', registrationCode);
    
    if (!/^\d{5}$/.test(registrationCode)) {
      console.log('[Settings-RegCode] ❌ Invalid format - not 5 digits');
      showAlert('❌ โค้ดต้องเป็นตัวเลข 5 หลักเท่านั้น');
      return;
    }

    setCodeLoading(true);
    try {
      const url = `${API_BASE}/settings/registration-code`;
      const payload = { code: registrationCode };
      console.log('[Settings-RegCode] Sending POST to:', url);
      console.log('[Settings-RegCode] Payload:', payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('[Settings-RegCode] Response status:', response.status);
      const data = await response.json();
      console.log('[Settings-RegCode] Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update code');
      }

      showAlert('✓ รหัสการลงทะเบียนถูกอัปเดตแล้ว');
      console.log('[Settings-RegCode] ✓ Code updated successfully');
      fetchRegistrationCode();
    } catch (error) {
      console.error('[Settings-RegCode] ❌ Error:', error);
      showAlert(error.message);
    } finally {
      setCodeLoading(false);
    }
  };

  const fetchMikrotikConfig = async () => {
    try {
      console.log('[MikroTik] Fetching config from:', `${API_BASE}/settings/mikrotik`);
      const response = await fetch(`${API_BASE}/settings/mikrotik`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('[MikroTik] Fetched config:', { ...data, password: data.password ? '***' : '' });
      if (response.ok) {
        setMikrotikConfig(data);
      }
    } catch (error) {
      console.error('[MikroTik] Error fetching config:', error);
    }
  };

  const handleUpdateMikrotikConfig = async (e) => {
    e.preventDefault();
    
    console.log('[MikroTik] Starting config update:', { ...mikrotikConfig, password: '***' });
    
    if (!mikrotikConfig.ip || !mikrotikConfig.username || !mikrotikConfig.password) {
      showAlert('❌ IP, ชื่อผู้ใช้ และรหัสผ่าน จำเป็นต้องใส่');
      return;
    }

    setMikrotikLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/mikrotik`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mikrotikConfig),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update config');

      showAlert('✓ ค่าควรคุม MikroTik ถูกอัปเดตแล้ว');
      console.log('[MikroTik] ✓ Config updated successfully');
      fetchMikrotikConfig();
    } catch (error) {
      console.error('[MikroTik] ❌ Error:', error);
      showAlert(error.message);
    } finally {
      setMikrotikLoading(false);
    }
  };

  const handleTestMikrotikConnection = async () => {
    try {
      setMikrotikLoading(true);
      setMikrotikStatus(null);
      console.log('[MikroTik-Status] API Base:', API_BASE);
      console.log('[MikroTik-Status] Fetching system status...');
      
      const url = `${API_BASE}/settings/mikrotik/status`;
      console.log('[MikroTik-Status] Full URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('[MikroTik-Status] Response status:', response.status);
      console.log('[MikroTik-Status] Response headers:', response.headers);
      
      const data = await response.json();
      console.log('[MikroTik-Status] Response data:', data);
      
      if (response.ok && data.success) {
        console.log('[MikroTik-Status] ✓ Status received:', data.status);
        setMikrotikStatus(data.status);
        showAlert('✓ ดึงสถานะ MikroTik สำเร็จ');
      } else {
        console.error('[MikroTik-Status] ❌ Response not ok or no success flag');
        console.error('[MikroTik-Status] Response OK:', response.ok);
        console.error('[MikroTik-Status] Data Success:', data.success);
        showAlert('❌ ' + (data.message || 'Failed to fetch status'));
      }
    } catch (error) {
      console.error('[MikroTik-Status] ❌ Catch Error:', error);
      console.error('[MikroTik-Status] Error message:', error.message);
      console.error('[MikroTik-Status] Error stack:', error.stack);
      showAlert('Error: ' + error.message);
    } finally {
      setMikrotikLoading(false);
    }
  };

  const maxDailyTotal = Math.max(1, ...dailySummary.map((item) => item.total || 0));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">ตำแหน่งทั้งหมด</p>
          <p className="mt-2 text-3xl font-bold">{positions.length}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-700 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">แผนกทั้งหมด</p>
          <p className="mt-2 text-3xl font-bold">{departments.length}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">Database</p>
          <p className="mt-2 text-lg font-bold">{databaseStatus?.success ? 'Connected' : 'Configured'}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">MikroTik</p>
          <p className="mt-2 text-lg font-bold">{mikrotikStatus ? 'Status Ready' : 'Not Tested'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">🗄️ การเชื่อมต่อ Database MariaDB</h2>
            <p className="mt-1 text-sm text-gray-500">กำหนดค่า Host, Port, Database, Username และ Password พร้อมทดสอบการเชื่อมต่อได้ทันที</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            หลังเปลี่ยนค่า Database อาจต้อง <span className="font-semibold">restart backend</span> เพื่อให้ระบบใช้ค่าชุดใหม่
          </div>
        </div>

        <form onSubmit={handleUpdateDatabaseConfig} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Host</label>
              <input
                type="text"
                value={databaseConfig.host}
                onChange={(e) => setDatabaseConfig({ ...databaseConfig, host: e.target.value })}
                placeholder="localhost"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Port</label>
              <input
                type="number"
                value={databaseConfig.port}
                onChange={(e) => setDatabaseConfig({ ...databaseConfig, port: parseInt(e.target.value, 10) || 3306 })}
                min="1"
                max="65535"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Database Name</label>
              <input
                type="text"
                value={databaseConfig.database}
                onChange={(e) => setDatabaseConfig({ ...databaseConfig, database: e.target.value })}
                placeholder="mt_api"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={databaseConfig.username}
                onChange={(e) => setDatabaseConfig({ ...databaseConfig, username: e.target.value })}
                placeholder="root"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={databaseConfig.password}
                onChange={(e) => setDatabaseConfig({ ...databaseConfig, password: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={databaseLoading}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
            >
              {databaseLoading ? 'กำลังบันทึก...' : '💾 บันทึกค่าการเชื่อมต่อ'}
            </button>
            <button
              type="button"
              onClick={handleTestDatabaseConnection}
              disabled={databaseLoading}
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
            >
              {databaseLoading ? 'กำลังทดสอบ...' : '🔌 ทดสอบการเชื่อมต่อ'}
            </button>
          </div>

          {databaseStatus && (
            <div className={`rounded-lg border p-4 text-sm ${databaseStatus.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <p className="font-semibold">{databaseStatus.success ? 'เชื่อมต่อสำเร็จ' : 'เชื่อมต่อไม่สำเร็จ'}</p>
              <p className="mt-1">{databaseStatus.message}</p>
              {databaseStatus.info && (
                <p className="mt-2 text-xs">{databaseStatus.info.host}:{databaseStatus.info.port} / {databaseStatus.info.database}</p>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">🔔 LINE / Telegram Alerts</h2>
            <p className="mt-1 text-sm text-gray-500">ตั้งค่าการแจ้งเตือนอัตโนมัติเมื่อมี pending approvals, CPU สูง หรือ backup error</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            รองรับทั้ง <span className="font-semibold">LINE Notify</span> และ <span className="font-semibold">Telegram Bot</span>
          </div>
        </div>

        <form onSubmit={handleSaveAlertConfig} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={alertConfig.enabled}
                onChange={(e) => setAlertConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              เปิดใช้งานระบบ Smart Alerts
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Cooldown (minutes)</span>
              <input
                type="number"
                min="1"
                value={alertConfig.coolDownMinutes}
                onChange={(e) => setAlertConfig((prev) => ({ ...prev, coolDownMinutes: parseInt(e.target.value, 10) || 15 }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-green-950">LINE</h3>
                <label className="flex items-center gap-2 text-sm text-green-900">
                  <input
                    type="checkbox"
                    checked={alertConfig.channels.line.enabled}
                    onChange={(e) => setAlertConfig((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, line: { ...prev.channels.line, enabled: e.target.checked } },
                    }))}
                  />
                  Enable
                </label>
              </div>
              <label className="space-y-2 block">
                <span className="text-sm font-medium text-gray-700">LINE Token</span>
                <input
                  type="password"
                  value={alertConfig.channels.line.token}
                  onChange={(e) => setAlertConfig((prev) => ({
                    ...prev,
                    channels: { ...prev.channels, line: { ...prev.channels.line, token: e.target.value } },
                  }))}
                  placeholder="LINE Notify token"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-sky-950">Telegram</h3>
                <label className="flex items-center gap-2 text-sm text-sky-900">
                  <input
                    type="checkbox"
                    checked={alertConfig.channels.telegram.enabled}
                    onChange={(e) => setAlertConfig((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, telegram: { ...prev.channels.telegram, enabled: e.target.checked } },
                    }))}
                  />
                  Enable
                </label>
              </div>
              <div className="grid gap-3">
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-gray-700">Bot Token</span>
                  <input
                    type="password"
                    value={alertConfig.channels.telegram.botToken}
                    onChange={(e) => setAlertConfig((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, telegram: { ...prev.channels.telegram, botToken: e.target.value } },
                    }))}
                    placeholder="123456:ABC..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-gray-700">Chat ID</span>
                  <input
                    type="text"
                    value={alertConfig.channels.telegram.chatId}
                    onChange={(e) => setAlertConfig((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, telegram: { ...prev.channels.telegram, chatId: e.target.value } },
                    }))}
                    placeholder="เช่น -1001234567890"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={alertConfig.triggers.pendingApprovals}
                onChange={(e) => setAlertConfig((prev) => ({ ...prev, triggers: { ...prev.triggers, pendingApprovals: e.target.checked } }))}
              />
              Pending approvals
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={alertConfig.triggers.cpuHigh}
                onChange={(e) => setAlertConfig((prev) => ({ ...prev, triggers: { ...prev.triggers, cpuHigh: e.target.checked } }))}
              />
              CPU สูง
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={alertConfig.triggers.backupError}
                onChange={(e) => setAlertConfig((prev) => ({ ...prev, triggers: { ...prev.triggers, backupError: e.target.checked } }))}
              />
              Backup error
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Pending threshold</span>
              <input
                type="number"
                min="1"
                value={alertConfig.triggers.pendingThreshold}
                onChange={(e) => setAlertConfig((prev) => ({ ...prev, triggers: { ...prev.triggers, pendingThreshold: parseInt(e.target.value, 10) || 5 } }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">CPU threshold (%)</span>
              <input
                type="number"
                min="1"
                max="100"
                value={alertConfig.triggers.cpuThreshold}
                onChange={(e) => setAlertConfig((prev) => ({ ...prev, triggers: { ...prev.triggers, cpuThreshold: parseInt(e.target.value, 10) || 85 } }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={alertLoading || !canUpdateSettings}
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
            >
              {alertLoading ? 'กำลังบันทึก...' : '💾 บันทึก Alert Settings'}
            </button>
            <button
              type="button"
              onClick={handleSendAlertTest}
              disabled={alertTestLoading || !canTestSettings}
              className="flex-1 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
            >
              {alertTestLoading ? 'กำลังส่ง...' : '📨 ส่ง Test Alert'}
            </button>
          </div>

          {alertTestResult && (
            <div className={`rounded-lg border p-4 text-sm ${alertTestResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p className="font-semibold">ผลการทดสอบ Alert</p>
              <p className="mt-1">{alertTestResult.reason || alertTestResult.message || (alertTestResult.success ? 'ส่งสำเร็จ' : 'ยังไม่สำเร็จ')}</p>
              {Array.isArray(alertTestResult.results) && alertTestResult.results.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  {alertTestResult.results.map((item) => (
                    <div key={item.channel}>• {item.channel}: {item.success ? 'success' : (item.reason || item.message || 'failed')}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">🗂️ เมนูรายงานถูกแยกออกแล้ว</p>
        <p className="mt-1">ส่วน `Backup / Restore Settings`, `Export รายงานผู้ใช้งาน` และ `Dashboard สรุปสถิติรายวัน` ถูกย้ายไปที่เมนูใหม่ชื่อ <span className="font-bold">รายงาน</span> เพื่อให้หน้า Settings ใช้งานง่ายขึ้น</p>
      </div>

      {/* Positions Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-black">⚙️ ตำแหน่ง (Positions)</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{positions.length} รายการ</span>
        </div>

        {/* Add Position Form */}
        <form onSubmit={handleAddPosition} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid gap-4 sm:grid-cols-3">
            <input
              type="text"
              placeholder="ชื่อตำแหน่ง"
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 text-black"
              required
            />
            <input
              type="text"
              placeholder="คำอธิบาย (ไม่บังคับ)"
              value={newPositionDesc}
              onChange={(e) => setNewPositionDesc(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 text-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? 'กำลังเพิ่ม...' : '+ เพิ่มตำแหน่ง'}
            </button>
          </div>
        </form>

        {/* Positions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-black">
              <tr>
                <th className="px-4 py-3">ชื่อตำแหน่ง</th>
                <th className="px-4 py-3">คำอธิบาย</th>
                <th className="px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-4 text-center text-gray-500">
                    ยังไม่มีตำแหน่ง
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-black">
                      {editPositionId === pos.id ? (
                        <input
                          type="text"
                          value={editPositionPayload.name}
                          onChange={(e) => setEditPositionPayload({ ...editPositionPayload, name: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                        />
                      ) : pos.name}
                    </td>
                    <td className="px-4 py-4 text-black">
                      {editPositionId === pos.id ? (
                        <input
                          type="text"
                          value={editPositionPayload.description}
                          onChange={(e) => setEditPositionPayload({ ...editPositionPayload, description: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                        />
                      ) : (pos.description || '-')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {editPositionId === pos.id ? (
                          <>
                            <button
                              onClick={handleSavePosition}
                              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >
                              💾 บันทึก
                            </button>
                            <button
                              onClick={() => setEditPositionId(null)}
                              className="rounded bg-slate-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-600"
                            >
                              ยกเลิก
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEditPosition(pos)}
                            className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-black transition hover:bg-amber-600"
                          >
                            ✏️ แก้ไข
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePosition(pos.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                        >
                          ✕ ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Departments Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-black">🏢 แผนก (Departments)</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{departments.length} รายการ</span>
        </div>

        {/* Add Department Form */}
        <form onSubmit={handleAddDepartment} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid gap-4 sm:grid-cols-3">
            <input
              type="text"
              placeholder="ชื่อแผนก"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 text-black"
              required
            />
            <input
              type="text"
              placeholder="คำอธิบาย (ไม่บังคับ)"
              value={newDepartmentDesc}
              onChange={(e) => setNewDepartmentDesc(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 text-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? 'กำลังเพิ่ม...' : '+ เพิ่มแผนก'}
            </button>
          </div>
        </form>

        {/* Departments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-black">
              <tr>
                <th className="px-4 py-3">ชื่อแผนก</th>
                <th className="px-4 py-3">คำอธิบาย</th>
                <th className="px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-4 text-center text-gray-500">
                    ยังไม่มีแผนก
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-black">
                      {editDepartmentId === dept.id ? (
                        <input
                          type="text"
                          value={editDepartmentPayload.name}
                          onChange={(e) => setEditDepartmentPayload({ ...editDepartmentPayload, name: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                        />
                      ) : dept.name}
                    </td>
                    <td className="px-4 py-4 text-black">
                      {editDepartmentId === dept.id ? (
                        <input
                          type="text"
                          value={editDepartmentPayload.description}
                          onChange={(e) => setEditDepartmentPayload({ ...editDepartmentPayload, description: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                        />
                      ) : (dept.description || '-')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {editDepartmentId === dept.id ? (
                          <>
                            <button
                              onClick={handleSaveDepartment}
                              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >
                              💾 บันทึก
                            </button>
                            <button
                              onClick={() => setEditDepartmentId(null)}
                              className="rounded bg-slate-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-600"
                            >
                              ยกเลิก
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEditDepartment(dept)}
                            className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-black transition hover:bg-amber-600"
                          >
                            ✏️ แก้ไข
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                        >
                          ✕ ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">📜 เงื่อนไขการใช้งาน / PDPA</h2>
            <p className="mt-1 text-sm text-gray-500">ปรับข้อความคำยินยอมสำหรับหน้าสมัครใช้งานให้สอดคล้องกับ พ.ร.บ.คอมพิวเตอร์ และการคุ้มครองข้อมูลส่วนบุคคล</p>
          </div>
          <div className="rounded-xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900 ring-1 ring-cyan-200">
            แนะนำให้ระบุวัตถุประสงค์การเก็บข้อมูล ระยะเวลาเก็บรักษา และช่องทางติดต่อผู้ดูแลระบบ
          </div>
        </div>

        <form onSubmit={handleUpdateRegistrationConsent} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">หัวข้อ</span>
              <input
                type="text"
                value={registrationConsent.title}
                onChange={(e) => setRegistrationConsent({ ...registrationConsent, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">ข้อความ checkbox หลัก</span>
              <input
                type="text"
                value={registrationConsent.checkboxLabel}
                onChange={(e) => setRegistrationConsent({ ...registrationConsent, checkboxLabel: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-gray-700">รายละเอียดเงื่อนไข</span>
            <textarea
              value={registrationConsent.content}
              onChange={(e) => setRegistrationConsent({ ...registrationConsent, content: e.target.value })}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-black bg-white outline-none focus:border-blue-500"
              placeholder="ระบุเงื่อนไขการใช้งานและข้อความ PDPA"
              required
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={registrationConsent.enabled}
                onChange={(e) => setRegistrationConsent({ ...registrationConsent, enabled: e.target.checked })}
              />
              เปิดใช้งานการบังคับยอมรับเงื่อนไขในหน้าสมัครใช้งาน
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={registrationConsent.requireAccuracyConfirmation}
                onChange={(e) => setRegistrationConsent({ ...registrationConsent, requireAccuracyConfirmation: e.target.checked })}
              />
              บังคับให้รับรองว่าข้อมูลที่กรอกเป็นจริง
            </label>
          </div>

          {registrationConsent.requireAccuracyConfirmation && (
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-gray-700">ข้อความ checkbox รับรองข้อมูล</span>
              <input
                type="text"
                value={registrationConsent.accuracyLabel}
                onChange={(e) => setRegistrationConsent({ ...registrationConsent, accuracyLabel: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={consentLoading}
            className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
          >
            {consentLoading ? 'กำลังบันทึก...' : '💾 บันทึกเงื่อนไขการใช้งาน'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">🌐 ข้อความระบบและ Logo</h2>
            <p className="mt-1 text-sm text-gray-500">ปรับชื่อระบบ คำอธิบาย หัวข้อ Dashboard และเพิ่มโลโก้ขนาดเล็กได้จากส่วนนี้</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-200">
            Logo แนะนำไม่เกิน <span className="font-semibold">40 KB</span> และ favicon ไม่เกิน <span className="font-semibold">20 KB</span>
          </div>
        </div>

        <form onSubmit={handleSaveBranding} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="grid gap-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logo ระบบ</p>
                {brandingConfig.logoUrl ? (
                  <img src={brandingConfig.logoUrl} alt={brandingConfig.appName} className="h-16 w-16 rounded-2xl bg-white object-contain p-1 shadow" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-3xl">🌐</div>
                )}
                <label className="w-full cursor-pointer rounded-lg bg-slate-800 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-900">
                  อัปโหลด Logo
                  <input type="file" accept="image/*" onChange={handleBrandingLogoUpload} className="hidden" />
                </label>
                {brandingConfig.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setBrandingConfig({ ...brandingConfig, logoUrl: '' })}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    ลบ Logo
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Favicon / Browser Tab</p>
                {brandingConfig.faviconUrl ? (
                  <img src={brandingConfig.faviconUrl} alt="Favicon" className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-2xl">🪪</div>
                )}
                <label className="w-full cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-indigo-700">
                  อัปโหลด Favicon
                  <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" />
                </label>
                {brandingConfig.faviconUrl && (
                  <button
                    type="button"
                    onClick={() => setBrandingConfig({ ...brandingConfig, faviconUrl: '' })}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    ลบ Favicon
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">ชื่อระบบ</span>
                <input
                  type="text"
                  value={brandingConfig.appName}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, appName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">คำอธิบายระบบ</span>
                <input
                  type="text"
                  value={brandingConfig.appSubtitle}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, appSubtitle: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">ชื่อหน้า Browser Tab</span>
                <input
                  type="text"
                  value={brandingConfig.browserTitle}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, browserTitle: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">หัวข้อ Dashboard</span>
                <input
                  type="text"
                  value={brandingConfig.dashboardTitle}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, dashboardTitle: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">คำอธิบาย Dashboard</span>
                <input
                  type="text"
                  value={brandingConfig.dashboardSubtitle}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, dashboardSubtitle: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">Footer text</span>
                <input
                  type="text"
                  value={brandingConfig.footerText}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, footerText: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-gray-700">Logo URL / Data URL (ไม่บังคับ)</span>
              <input
                type="text"
                value={brandingConfig.logoUrl}
                onChange={(e) => setBrandingConfig({ ...brandingConfig, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png หรือ data:image/png;base64,..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-gray-700">Favicon URL / Data URL (ไม่บังคับ)</span>
              <input
                type="text"
                value={brandingConfig.faviconUrl}
                onChange={(e) => setBrandingConfig({ ...brandingConfig, faviconUrl: e.target.value })}
                placeholder="https://example.com/favicon.ico หรือ data:image/png;base64,..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={brandingLoading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
          >
            {brandingLoading ? 'กำลังบันทึก...' : '💾 บันทึกข้อความและ Logo'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">🎟️ ตั้งค่าคูปอง QR</h2>
            <p className="mt-1 text-sm text-gray-500">กำหนด URL สำหรับ Hotspot Login, ชื่อแบรนด์ และหัวข้อที่แสดงบนคูปอง QR</p>
          </div>
          <div className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-900 ring-1 ring-orange-200">
            ค่าที่บันทึกที่นี่จะถูกใช้ตอนพิมพ์คูปองจากเมนูผู้ใช้โดยอัตโนมัติ
          </div>
        </div>

        <form onSubmit={handleSaveCouponSettings} className="space-y-4">
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-gray-700">1) Hotspot Login URL สำหรับ QR Code</span>
            <input
              type="text"
              value={couponSettings.loginUrl}
              onChange={(e) => setCouponSettings({ ...couponSettings, loginUrl: e.target.value })}
              placeholder="เช่น http://192.168.10.1/login"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-gray-700">2) ชื่อแบรนด์บนคูปอง</span>
              <input
                type="text"
                value={couponSettings.brandName}
                onChange={(e) => setCouponSettings({ ...couponSettings, brandName: e.target.value })}
                placeholder="เช่น MT-API HOTSPOT"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium text-gray-700">3) หัวข้อบนคูปอง</span>
              <input
                type="text"
                value={couponSettings.couponTitle}
                onChange={(e) => setCouponSettings({ ...couponSettings, couponTitle: e.target.value })}
                placeholder="เช่น Internet Coupon Slip"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={couponLoading || !canUpdateSettings}
            className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
          >
            {couponLoading ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่าคูปอง'}
          </button>
        </form>
      </div>

      {/* Registration Code Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-black">🔐 รหัสการลงทะเบียน</h2>

        <form onSubmit={handleUpdateRegistrationCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ตั้งรหัสการลงทะเบียน (5 หลัก)
            </label>
            <input
              type="text"
              value={registrationCode}
              onChange={(e) => setRegistrationCode(e.target.value.slice(0, 5))}
              placeholder="เช่น 12345"
              maxLength="5"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest font-bold text-black bg-white"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              บุคลากรจะต้องกรอกรหัสนี้ เมื่อลงทะเบียนใช้งาน
            </p>
          </div>

          <button
            type="submit"
            disabled={codeLoading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
          >
            {codeLoading ? 'กำลังอัปเดต...' : '💾 บันทึกรหัสการลงทะเบียน'}
          </button>
        </form>
      </div>

      {/* MikroTik Configuration Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-black">📡 ค่าตั้งค่า MikroTik</h2>

        <form onSubmit={handleUpdateMikrotikConfig} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={mikrotikConfig.ip}
                onChange={(e) => setMikrotikConfig({ ...mikrotikConfig, ip: e.target.value })}
                placeholder="เช่น 192.168.1.1"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                value={mikrotikConfig.port}
                onChange={(e) => setMikrotikConfig({ ...mikrotikConfig, port: parseInt(e.target.value) || 8728 })}
                placeholder="8728"
                min="1"
                max="65535"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้ใช้ (Username)
              </label>
              <input
                type="text"
                value={mikrotikConfig.username}
                onChange={(e) => setMikrotikConfig({ ...mikrotikConfig, username: e.target.value })}
                placeholder="admin"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                value={mikrotikConfig.password}
                onChange={(e) => setMikrotikConfig({ ...mikrotikConfig, password: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🐧 MikroTik OS Version
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="os_version"
                  value="v6"
                  checked={mikrotikConfig.os_version === 'v6'}
                  onChange={(e) => setMikrotikConfig({ ...mikrotikConfig, os_version: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">RouterOS v6</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="os_version"
                  value="v7"
                  checked={mikrotikConfig.os_version === 'v7'}
                  onChange={(e) => setMikrotikConfig({ ...mikrotikConfig, os_version: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">RouterOS v7</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              เลือก version ของ MikroTik OS เพื่อใช้คำสั่ง API ที่ถูกต้อง
            </p>
          </div>

          <p className="text-xs text-gray-500">
            ⚠️ ข้อมูลการเข้าสู่ระบบ MikroTik จะถูกเก็บรักษาอย่างปลอดภัย
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={mikrotikLoading}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
            >
              {mikrotikLoading ? 'กำลังอัปเดต...' : '💾 บันทึกค่าตั้งค่า MikroTik'}
            </button>
            <button
              type="button"
              onClick={handleTestMikrotikConnection}
              disabled={mikrotikLoading}
              className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
            >
              {mikrotikLoading ? 'ดำเนินการ...' : '📊 ดึงสถานะ'}
            </button>
          </div>

          {/* MikroTik Status Display */}
          {mikrotikStatus && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-bold text-green-800 mb-3">📊 สถานะ MikroTik System</h3>
              <div className="grid gap-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="font-medium">Uptime:</span>
                  <span className="text-black">{mikrotikStatus.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Free Memory:</span>
                  <span className="text-black">{mikrotikStatus.freememory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total Memory:</span>
                  <span className="text-black">{mikrotikStatus.totalmemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">CPU Cores:</span>
                  <span className="text-black">{mikrotikStatus.cpu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Architecture:</span>
                  <span className="text-black">{mikrotikStatus.architecture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Version:</span>
                  <span className="text-black">{mikrotikStatus.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">OS Type:</span>
                  <span className="text-black">RouterOS {mikrotikStatus.os_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Board Name:</span>
                  <span className="text-black">{mikrotikStatus['board-name']}</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Email Configuration Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-black">📧 ตั้งค่า Email Notification</h2>
        <form onSubmit={handleSaveEmailConfig} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
              <input
                type="text"
                value={emailConfig.host}
                onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                placeholder="เช่น smtp.gmail.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
              <input
                type="number"
                value={emailConfig.port}
                onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) || 587 })}
                placeholder="587"
                min="1"
                max="65535"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username / Email</label>
              <input
                type="text"
                value={emailConfig.user}
                onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password / App Password</label>
              <input
                type="password"
                value={emailConfig.password}
                onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                placeholder="เว้นว่างเพื่อไม่เปลี่ยน"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ส่ง (From Name)</label>
              <input
                type="text"
                value={emailConfig.fromName}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                placeholder="MT-API Hotspot"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email ผู้ส่ง (From Address)</label>
              <input
                type="text"
                value={emailConfig.fromAddress}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromAddress: e.target.value })}
                placeholder="noreply@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={emailConfig.secure}
                onChange={(e) => setEmailConfig({ ...emailConfig, secure: e.target.checked })}
                className="h-4 w-4"
              />
              ใช้ SSL/TLS (port 465)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={emailConfig.notifyOnApprove}
                onChange={(e) => setEmailConfig({ ...emailConfig, notifyOnApprove: e.target.checked })}
                className="h-4 w-4"
              />
              ส่ง Email เมื่ออนุมัติผู้ใช้
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Template</label>
            <input
              type="text"
              value={emailConfig.subjectTemplate}
              onChange={(e) => setEmailConfig({ ...emailConfig, subjectTemplate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body Template <span className="text-xs text-gray-500">(ใช้ {'{{fullName}}'}, {'{{username}}'}, {'{{password}}'})</span>
            </label>
            <textarea
              rows={5}
              value={emailConfig.bodyTemplate}
              onChange={(e) => setEmailConfig({ ...emailConfig, bodyTemplate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black bg-white outline-none focus:border-blue-500 font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={emailLoading || !canUpdateSettings}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {emailLoading ? 'กำลังบันทึก...' : '💾 บันทึก'}
            </button>
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={emailTestLoading || !canTestSettings}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:bg-gray-400"
            >
              {emailTestLoading ? 'กำลังทดสอบ...' : '🧪 ทดสอบส่ง Email'}
            </button>
          </div>
          {emailTestResult && (
            <div className={`mt-3 rounded-lg p-3 text-sm ${emailTestResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {emailTestResult.success ? '✅' : '❌'} {emailTestResult.message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
