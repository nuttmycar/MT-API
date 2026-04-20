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

function UserManagementComponent({ token, isAdmin, userRole = 'super_admin', permissions = {}, onLogout, showAlert }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [hotspotUsers, setHotspotUsers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [codeRequired, setCodeRequired] = useState(false);
  const [registrationConsent, setRegistrationConsent] = useState(DEFAULT_REGISTRATION_CONSENT);
  const [registerPayload, setRegisterPayload] = useState({ 
    fullName: '', 
    username: '', 
    email: '', 
    password: '', 
    profile: 'default',
    idCardNumber: '',
    phoneNumber: '',
    position: '',
    department: '',
    registrationCode: '',
    acceptedTerms: false,
    acceptedAccuracy: false,
  });
  const [editId, setEditId] = useState(null);
  const [editPayload, setEditPayload] = useState({ fullName: '', email: '', password: '', profile: 'default', expiryDate: '' });
  const [selectedPendingRequests, setSelectedPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [batchUsers, setBatchUsers] = useState([]);
  const [couponUsers, setCouponUsers] = useState([]);
  const [loginBaseUrl, setLoginBaseUrl] = useState('http://192.168.10.1/login');
  const [couponBrand, setCouponBrand] = useState('MT-API HOTSPOT');
  const [couponTitle, setCouponTitle] = useState('Internet Coupon Slip');
  const [importSummary, setImportSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchUsers, setSelectedBatchUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // MikroTik Direct Users tab state
  const [mikrotikSearchTerm, setMikrotikSearchTerm] = useState('');
  const [mikrotikPage, setMikrotikPage] = useState(1);
  const [mikrotikEditUser, setMikrotikEditUser] = useState(null);
  const [mikrotikEditPayload, setMikrotikEditPayload] = useState({ password: '', profile: 'default', comment: '' });
  const [showAddMikrotikUser, setShowAddMikrotikUser] = useState(false);
  const [addMikrotikPayload, setAddMikrotikPayload] = useState({ name: '', password: '', profile: 'default', comment: '' });
  const [generateConfig, setGenerateConfig] = useState({
    count: 10,
    prefix: 'USR',
    usernameLength: 8,
    passwordLength: 8,
    profile: 'default',
  });

  // Saved (DB) generated users state
  const [savedUsers, setSavedUsers] = useState([]);
  const [savedUsersTotal, setSavedUsersTotal] = useState(0);
  const [savedUsersPage, setSavedUsersPage] = useState(1);
  const [savedUsersSearch, setSavedUsersSearch] = useState('');
  const [savedUsersStatusFilter, setSavedUsersStatusFilter] = useState('all');
  const [savedUsersTypeFilter, setSavedUsersTypeFilter] = useState('all');
  const [savedUsersBatchFilter, setSavedUsersBatchFilter] = useState('all');
  const [batchLabels, setBatchLabels] = useState([]);
  const [batchLabelInput, setBatchLabelInput] = useState('');
  const [editSavedUser, setEditSavedUser] = useState(null);
  const [editSavedPayload, setEditSavedPayload] = useState({ password: '', profile: 'default', comment: '', fullName: '', expiryDate: '', batchLabel: '' });
  const [selectedSavedUsers, setSelectedSavedUsers] = useState([]);
  const userActions = permissions?.actions?.users || {};
  const fallbackManage = isAdmin && ['super_admin', 'admin'].includes(userRole);
  const canApproveUsers = isAdmin && (userActions.approve ?? fallbackManage);
  const canEditUsers = isAdmin && (userActions.edit ?? fallbackManage);
  const canDeleteUsers = isAdmin && (userActions.delete ?? fallbackManage);
  const canImportUsers = isAdmin && (userActions.import ?? fallbackManage);
  const canManageUsers = canApproveUsers || canEditUsers || canDeleteUsers || canImportUsers;

  // MikroTik direct users computed
  const mikrotikItemsPerPage = 10;
  const normalizedMikrotikSearch = mikrotikSearchTerm.trim().toLowerCase();
  const filteredMikrotikUsers = hotspotUsers.filter((u) => {
    if (!normalizedMikrotikSearch) return true;
    return [u.name, u.profile, u.comment].some((v) => String(v || '').toLowerCase().includes(normalizedMikrotikSearch));
  });
  const mikrotikTotalPages = Math.max(1, Math.ceil(filteredMikrotikUsers.length / mikrotikItemsPerPage));
  const safeMikrotikPage = Math.min(mikrotikPage, mikrotikTotalPages);
  const paginatedMikrotikUsers = filteredMikrotikUsers.slice(
    (safeMikrotikPage - 1) * mikrotikItemsPerPage,
    safeMikrotikPage * mikrotikItemsPerPage,
  );

  const guardAdminAction = (allowed = canManageUsers, message = 'สิทธิ์ของ role นี้ใช้งานได้แบบอ่านอย่างเดียว') => {
    if (allowed) return true;
    showAlert(message);
    return false;
  };

  const pendingRequests = requests.filter((item) => item.status === 'pending');
  const approvedRequests = requests.filter((item) => item.status === 'approved');
  const visibleRequests = activeTab === 'approved' ? approvedRequests : pendingRequests;
  const hotspotUserMap = new Map(hotspotUsers.map((user) => [user.name || user.username, user]));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRequests = visibleRequests.filter((item) => {
    if (!normalizedSearch) return true;
    return [item.fullName, item.username, item.email, item.profile]
      .some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
  });
  const filteredBatchUsers = batchUsers.filter((user) => {
    if (!normalizedSearch) return true;
    return [user.username, user.password, user.profile, user.comment]
      .some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
  });
  const selectedBatchItems = batchUsers.filter((user) => selectedBatchUsers.includes(user.username));
  const allFilteredBatchSelected = filteredBatchUsers.length > 0
    && filteredBatchUsers.every((user) => selectedBatchUsers.includes(user.username));
  const activeItems = activeTab === 'batch' ? filteredBatchUsers : filteredRequests;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = activeItems.length === 0 ? 0 : ((safeCurrentPage - 1) * itemsPerPage) + 1;
  const pageEnd = Math.min(safeCurrentPage * itemsPerPage, activeItems.length);
  const paginatedItems = activeItems.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);
  const paginatedBatchUsers = activeTab === 'batch' ? paginatedItems : [];
  const paginatedRequests = activeTab === 'batch' ? [] : paginatedItems;

  const getMikrotikStatus = (item) => {
    if (item.status !== 'approved') {
      return {
        label: '🟡 Pending',
        className: 'bg-yellow-100 text-yellow-800',
      };
    }

    if (item.mikrotikExists === false) {
      return {
        label: '⚠️ Not found',
        className: 'bg-gray-200 text-gray-700',
      };
    }

    if (item.mikrotikDisabled) {
      return {
        label: '🔴 Disabled',
        className: 'bg-red-100 text-red-800',
      };
    }

    return {
      label: '🟢 Active',
      className: 'bg-green-100 text-green-800',
    };
  };

  const parseBatchFileText = (text) => {
    const parsedUsers = [];
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    const parseKeyValueLine = (line) => {
      const result = {};
      const matches = line.matchAll(/([a-zA-Z][\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g);

      for (const match of matches) {
        const [, key, doubleQuoted, singleQuoted, plainValue] = match;
        result[key] = doubleQuoted ?? singleQuoted ?? plainValue ?? '';
      }

      return result;
    };

    lines.forEach((line) => {
      if (/^(#|;|::|rem\s)/i.test(line)) return;
      if (/^\/ip\s+hotspot\s+user$/i.test(line)) return;

      let user = null;

      if (line.includes('name=') || line.includes('username=')) {
        const entry = parseKeyValueLine(line);
        const username = entry.name || entry.username;
        const password = entry.password || entry.pass;

        if (username && password) {
          user = {
            fullName: entry['full-name'] || username,
            username,
            password,
            profile: entry.profile || 'default',
            comment: entry.comment || 'Imported from BAT file',
          };
        }
      } else if (line.includes(',') || line.includes(';')) {
        const parts = line.split(/[;,]/).map((part) => part.trim());
        const [username, password, profile, comment] = parts;

        if (username?.toLowerCase() === 'username' && password?.toLowerCase() === 'password') {
          return;
        }

        if (username && password) {
          user = {
            fullName: username,
            username,
            password,
            profile: profile || 'default',
            comment: comment || 'Imported from file',
          };
        }
      }

      if (user) {
        parsedUsers.push(user);
      }
    });

    return Array.from(new Map(parsedUsers.map((user) => [user.username, user])).values());
  };

  const buildCouponLoginUrl = (user) => {
    const baseUrl = (loginBaseUrl || '').trim();
    if (!baseUrl) {
      return `Username: ${user.username}\nPassword: ${user.password}`;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password)}`;
  };

  const getCouponQrUrl = (user) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(buildCouponLoginUrl(user))}`;
  };

  const generateRandomString = (length, charset) => {
    let result = '';
    for (let index = 0; index < length; index += 1) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      result += charset[randomIndex];
    }
    return result;
  };

  const handleGenerateBatchUsers = () => {
    if (!guardAdminAction(canImportUsers, 'role นี้ยังไม่สามารถ Generate / Import users ได้')) return;
    const count = Number(generateConfig.count) || 0;
    const usernameLength = Number(generateConfig.usernameLength) || 0;
    const passwordLength = Number(generateConfig.passwordLength) || 0;
    const prefix = (generateConfig.prefix || '').trim();

    if (count < 1 || count > 500) {
      showAlert('จำนวนที่ต้องการ generate ต้องอยู่ระหว่าง 1 ถึง 500');
      return;
    }

    if (usernameLength <= prefix.length) {
      showAlert('ความยาว username ต้องมากกว่า prefix ที่กำหนด');
      return;
    }

    if (passwordLength < 4) {
      showAlert('ความยาว password ควรอย่างน้อย 4 ตัวอักษร');
      return;
    }

    const usernameCharset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const passwordCharset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const generated = [];
    const usedNames = new Set();
    const suffixLength = Math.max(1, usernameLength - prefix.length);
    let attempts = 0;

    while (generated.length < count && attempts < count * 50) {
      attempts += 1;
      const username = `${prefix}${generateRandomString(suffixLength, usernameCharset)}`;
      if (usedNames.has(username)) continue;

      usedNames.add(username);
      generated.push({
        fullName: username,
        username,
        password: generateRandomString(passwordLength, passwordCharset),
        profile: generateConfig.profile || 'default',
        comment: 'Generated coupon user',
        sourceType: 'generated',
      });
    }

    if (!generated.length) {
      showAlert('ไม่สามารถสร้างข้อมูลผู้ใช้ได้ กรุณาลองใหม่');
      return;
    }

    setBatchUsers(generated);
    setCouponUsers(generated);
    setImportSummary(null);
    setSelectedBatchUsers([]);
    setActiveTab('batch');
    showAlert(`สร้าง user จำนวน ${generated.length} รายการเรียบร้อยแล้ว`);
  };

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchRequests();
      if (isAdmin) {
        fetchProfiles();
        fetchHotspotUsers();
        fetchSavedUsers({ page: 1 });
        fetchBatchLabels();
      }
    }
  }, [token, isAdmin]);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedUsers({ page: 1, search: savedUsersSearch, status: savedUsersStatusFilter, type: savedUsersTypeFilter, batchLabel: savedUsersBatchFilter });
    }
  }, [activeTab]);


  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    // Fetch positions and departments for both registration and admin views
    fetchPositions();
    fetchDepartments();
    fetchRegistrationConsent();
    // Check if registration code is required
    fetchCodeRequirement();
  }, [isAdmin, token]);

  const fetchPositions = async () => {
    try {
      // Use public endpoint if not admin, protected endpoint if admin
      const endpoint = isAdmin ? '/settings/positions' : '/settings/positions/public';
      const headers = isAdmin && token 
        ? { Authorization: `Bearer ${token}` }
        : {};
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: headers,
      });
      const data = await response.json();
      if (response.ok) {
        console.log('[Positions] Fetched:', data);
        setPositions(data);
      } else {
        console.error('[Positions] API error:', data);
      }
    } catch (error) {
      console.error('[Positions] Error fetching:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      // Use public endpoint if not admin, protected endpoint if admin
      const endpoint = isAdmin ? '/settings/departments' : '/settings/departments/public';
      const headers = isAdmin && token 
        ? { Authorization: `Bearer ${token}` }
        : {};
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: headers,
      });
      const data = await response.json();
      if (response.ok) {
        console.log('[Departments] Fetched:', data);
        setDepartments(data);
      } else {
        console.error('[Departments] API error:', data);
      }
    } catch (error) {
      console.error('[Departments] Error fetching:', error);
    }
  };

  const fetchRegistrationConsent = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/registration-consent/public`);
      const data = await response.json();
      if (response.ok) {
        setRegistrationConsent({ ...DEFAULT_REGISTRATION_CONSENT, ...data });
      }
    } catch (error) {
      console.error('[RegistrationConsent] Error fetching:', error);
    }
  };

  const fetchCodeRequirement = async () => {
    try {
      const url = `${API_BASE}/settings/registration-code/public`;
      console.log('[CodeRequirement] Fetching from:', url);
      const response = await fetch(url);
      console.log('[CodeRequirement] Response status:', response.status);
      const data = await response.json();
      console.log('[CodeRequirement] Data received:', data);
      if (response.ok) {
        console.log('[CodeRequirement] ✓ Code required:', data.codeRequired);
        setCodeRequired(data.codeRequired);
      } else {
        console.error('[CodeRequirement] ✗ API error:', data);
        setCodeRequired(true); // Default to requiring code for safety
      }
    } catch (error) {
      console.error('[CodeRequirement] ✗ Error fetching:', error);
      setCodeRequired(true); // Default to requiring code for safety
    }
  };

  const fetchProfiles = async () => {
    try {
      const url = `${API_BASE}/requests/profiles`;
      console.log('[PROFILES] Fetching from:', url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[PROFILES] Response status:', response.status);
      const data = await response.json();
      console.log('[PROFILES] Data received:', data);

      const normalizedProfiles = Array.isArray(data)
        ? data
        : data && typeof data === 'object'
          ? Object.entries(data).map(([name, config]) => ({
              name,
              rateLimit: config?.rateLimit || 'unknown',
            }))
          : [{ name: 'default', rateLimit: 'unlimited' }];

      setProfiles(normalizedProfiles);
      setGenerateConfig((prev) => {
        const fallbackProfile = normalizedProfiles[0]?.name || 'default';
        return normalizedProfiles.some((item) => item.name === prev.profile)
          ? prev
          : { ...prev, profile: fallbackProfile };
      });
    } catch (error) {
      console.error('[PROFILES] Error fetching:', error);
      setProfiles([{ name: 'default', rateLimit: 'unlimited' }]);
    }
  };

  const fetchHotspotUsers = async () => {
    try {
      const url = `${API_BASE}/settings/mikrotik/hotspot-users`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        setHotspotUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (error) {
      console.error('[HotspotUsers] Error fetching:', error);
    }
  };

  const fetchSavedUsers = async ({ page = 1, search = savedUsersSearch, status = savedUsersStatusFilter, type = savedUsersTypeFilter, batchLabel = savedUsersBatchFilter } = {}) => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (type && type !== 'all') params.set('type', type);
      if (batchLabel && batchLabel !== 'all') params.set('batchLabel', batchLabel);
      const response = await fetch(`${API_BASE}/generated-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSavedUsers(data.data || []);
        setSavedUsersTotal(data.total || 0);
        setSavedUsersPage(page);
      }
    } catch (error) {
      console.error('[SavedUsers] Error fetching:', error);
    }
  };

  const fetchBatchLabels = async () => {
    try {
      const response = await fetch(`${API_BASE}/generated-users/batches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setBatchLabels(Array.isArray(data) ? data : []);
    } catch (_) {}
  };

  const updateBatchUser = (index, field, value) => {
    const previousUsername = batchUsers[index]?.username;
    const nextUsers = batchUsers.map((user, userIndex) => (
      userIndex === index ? { ...user, [field]: value } : user
    ));

    setBatchUsers(nextUsers);
    setCouponUsers(nextUsers);
    setImportSummary(null);

    if (field === 'username' && previousUsername && previousUsername !== value) {
      setSelectedBatchUsers((prev) => prev.map((item) => (item === previousUsername ? value : item)));
    }
  };

  const removeBatchUser = (index) => {
    const removedUsername = batchUsers[index]?.username;
    const nextUsers = batchUsers.filter((_, userIndex) => userIndex !== index);
    setBatchUsers(nextUsers);
    setCouponUsers(nextUsers);
    setImportSummary(null);
    setSelectedBatchUsers((prev) => prev.filter((item) => item !== removedUsername));
  };

  const toggleBatchUserSelection = (username) => {
    setSelectedBatchUsers((prev) => (
      prev.includes(username)
        ? prev.filter((item) => item !== username)
        : [...prev, username]
    ));
  };

  const toggleAllFilteredBatchUsers = () => {
    const filteredNames = filteredBatchUsers.map((user) => user.username);
    setSelectedBatchUsers((prev) => (
      allFilteredBatchSelected
        ? prev.filter((item) => !filteredNames.includes(item))
        : Array.from(new Set([...prev, ...filteredNames]))
    ));
  };

  const removeSelectedBatchUsers = () => {
    if (!selectedBatchUsers.length) {
      showAlert('กรุณาเลือกรายการที่ต้องการลบออกจาก list');
      return;
    }

    const nextUsers = batchUsers.filter((user) => !selectedBatchUsers.includes(user.username));
    setBatchUsers(nextUsers);
    setCouponUsers(nextUsers);
    setImportSummary(null);
    setSelectedBatchUsers([]);
    showAlert('ลบรายการที่เลือกออกจาก list เรียบร้อยแล้ว');
  };

  const handleBatchBulkRouterAction = async (action) => {
    const targetUsers = selectedBatchItems.filter((user) => hotspotUserMap.has(user.username));

    if (!targetUsers.length) {
      showAlert('ยังไม่มี user ที่เลือกและอยู่บน MikroTik');
      return;
    }

    if (action === 'delete' && !window.confirm(`ต้องการลบ ${targetUsers.length} users ออกจาก MikroTik หรือไม่?`)) {
      return;
    }

    const messages = {
      enable: 'เปิดการใช้งาน',
      disable: 'ปิดการใช้งาน',
      delete: 'ลบออกจาก MikroTik',
    };

    for (const user of targetUsers) {
      await handleBatchRouterUserAction(user, action, { silent: true });
    }

    showAlert(`${messages[action]} สำเร็จสำหรับ ${targetUsers.length} รายการ`);
  };

  const handleBatchRouterUserAction = async (user, action, options = {}) => {
    const { silent = false } = options;
    const actionMap = {
      disable: {
        method: 'POST',
        url: `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(user.username)}/disable`,
        successMessage: 'ปิดการใช้งาน user เรียบร้อยแล้ว',
      },
      enable: {
        method: 'POST',
        url: `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(user.username)}/enable`,
        successMessage: 'เปิดการใช้งาน user เรียบร้อยแล้ว',
      },
      delete: {
        method: 'DELETE',
        url: `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(user.username)}`,
        successMessage: 'ลบ user จาก MikroTik เรียบร้อยแล้ว',
      },
    };

    const config = actionMap[action];
    if (!config) return;

    if (action === 'delete' && !window.confirm(`ต้องการลบ ${user.username} ออกจาก MikroTik หรือไม่?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `${action} failed`);

      if (!silent) {
        showAlert(config.successMessage);
      }
      await fetchHotspotUsers();
      await fetchRequests();
    } catch (error) {
      if (!silent) {
        showAlert(error.message);
      } else {
        console.error(`[BatchRouterAction:${action}] ${user.username}`, error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const url = `${API_BASE}/requests/stats`;
      console.log('[Stats] Fetching from:', url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Stats] Response status:', response.status);
      const data = await response.json();
      console.log('[Stats] Data received:', data);
      if (response.ok) {
        console.log('[Stats] ✓ Updated stats:', data);
        setStats(data);
      } else {
        console.error('[Stats] ✗ API error:', data);
      }
    } catch (error) {
      console.error('[Stats] ✗ Error fetching:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const url = `${API_BASE}/requests`;
      console.log('[Requests] Fetching from:', url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Requests] Response status:', response.status);
      const data = await response.json();
      console.log('[Requests] Data count:', data?.length || 0);
      console.log('[Requests] Full data:', data);
      if (response.ok) {
        console.log('[Requests] ✓ Updated requests. Count:', data.length);
        setRequests(data);
      } else {
        console.error('[Requests] ✗ API error:', data);
      }
    } catch (error) {
      console.error('[Requests] ✗ Error fetching:', error);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (registrationConsent.enabled && !registerPayload.acceptedTerms) {
        throw new Error('กรุณาอ่านและยอมรับเงื่อนไขการใช้งานก่อนลงทะเบียน');
      }

      if (registrationConsent.enabled && registrationConsent.requireAccuracyConfirmation && !registerPayload.acceptedAccuracy) {
        throw new Error('กรุณาติ๊กรับรองว่าข้อมูลที่กรอกเป็นจริง');
      }

      // Verify registration code if required
      if (codeRequired) {
        if (!registerPayload.registrationCode) {
          throw new Error('Registration code is required');
        }
        
        console.log('[Register] Verifying registration code...');
        const codeVerifyResponse = await fetch(`${API_BASE}/settings/registration-code/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: registerPayload.registrationCode }),
        });
        
        const codeResult = await codeVerifyResponse.json();
        if (!codeVerifyResponse.ok || !codeResult.valid) {
          throw new Error(codeResult.message || 'Invalid registration code');
        }
        console.log('[Register] ✓ Registration code verified');
      }

      // Submit registration
      const response = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Registration failed');

      setRegisterPayload({ fullName: '', username: '', email: '', password: '', profile: 'default', idCardNumber: '', phoneNumber: '', position: '', department: '', registrationCode: '', acceptedTerms: false, acceptedAccuracy: false });
      showAlert('ลงทะเบียนเรียบร้อย รอการอนุมัติ');
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!guardAdminAction(canApproveUsers, 'role นี้ยังไม่สามารถอนุมัติผู้ใช้ได้')) return;
    console.log('[DEBUG] handleApprove called with id:', id);
    setLoading(true);
    try {
      const url = `${API_BASE}/requests/${id}/approve`;
      console.log('[DEBUG] Fetching:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[DEBUG] Response status:', response.status);
      const result = await response.json();
      console.log('[DEBUG] Response data:', result);
      if (!response.ok) throw new Error(result.message || 'Approve failed');
      
      if (result.mikrotikSuccess) {
        showAlert('✅ บันทึกสำเร็จ! ผู้ใช้ถูกเพิ่มใน MikroTik แล้ว');
      } else {
        showAlert('⚠️ อนุมัติสำเร็จ แต่ยังไม่ได้เพิ่มใน MikroTik');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      fetchStats();
      fetchRequests();
    } catch (error) {
      console.error('[DEBUG] Error:', error);
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!guardAdminAction(canDeleteUsers, 'role นี้ยังไม่สามารถลบผู้ใช้ได้')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Delete failed');
      showAlert('ลบข้อมูลเรียบร้อยแล้ว');
      fetchStats();
      fetchRequests();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseBatchFileText(text);

      if (!parsed.length) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ที่อ่านได้จากไฟล์ .bat/.csv');
      }

      const tagged = parsed.map((u) => ({ ...u, sourceType: 'imported' }));
      setBatchUsers(tagged);
      setCouponUsers(tagged);
      setImportSummary(null);
      setSelectedBatchUsers([]);
      setActiveTab('batch');
      showAlert(`พบข้อมูลผู้ใช้ ${parsed.length} รายการ พร้อมนำเข้าแล้ว`);
    } catch (error) {
      showAlert(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleImportBatchUsers = async (usersToImport = batchUsers) => {
    if (!guardAdminAction(canImportUsers, 'role นี้ยังไม่สามารถ Import users ได้')) return;
    if (!usersToImport.length) {
      showAlert('กรุณาเลือกไฟล์ .bat/.csv หรือกด generate ผู้ใช้ก่อน');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requests/batch-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ users: usersToImport }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');

      setImportSummary(result);
      setCouponUsers(result.imported || []);
      setActiveTab('batch');
      showAlert(`นำเข้าสำเร็จ ${result.imported?.length || 0} รายการ`);
      fetchRequests();
      fetchStats();
      fetchHotspotUsers();

      // Auto-save to generated_users DB after MikroTik import
      const importedOk = result.imported || [];
      if (importedOk.length > 0) {
        try {
          const usersToSave = importedOk.map((u) => ({
            ...u,
            type: (usersToImport.find((x) => x.username === u.username)?.sourceType) || u.sourceType || 'generated',
            mikrotikSynced: true,
          }));
          const saveResp = await fetch(`${API_BASE}/generated-users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ users: usersToSave, batchLabel: batchLabelInput.trim() || null }),
          });
          const saveResult = await saveResp.json();
          if (saveResp.ok) {
            showAlert(`บันทึกลง Database อัตโนมัติ ${saveResult.saved} รายการ`);
            fetchSavedUsers({ page: 1 });
            fetchBatchLabels();
          }
        } catch (_) {}
      }
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Save batch to DB ───────────────────────────────────────────────────────
  const handleSaveBatchToDB = async (usersToSave = batchUsers) => {
    if (!guardAdminAction(canImportUsers, 'role นี้ยังไม่สามารถบันทึก users ได้')) return;
    if (!usersToSave.length) {
      showAlert('ไม่มีรายการที่จะบันทึก');
      return;
    }
    setLoading(true);
    try {
      // Map sourceType → type so DB records generated vs imported correctly
      const tagged = usersToSave.map((u) => ({
        ...u,
        type: String(u.type || u.sourceType || 'generated') === 'imported' ? 'imported' : 'generated',
      }));
      const response = await fetch(`${API_BASE}/generated-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ users: tagged, batchLabel: batchLabelInput.trim() || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Save failed');
      showAlert(`บันทึกสำเร็จ ${result.saved} รายการ${result.skipped?.length ? `, ข้าม ${result.skipped.length}` : ''}`);
      fetchSavedUsers({ page: 1 });
      fetchBatchLabels();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Edit saved user ────────────────────────────────────────────────────────
  const handleSaveEditSavedUser = async () => {
    if (!editSavedUser) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/generated-users/${editSavedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editSavedPayload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Update failed');
      showAlert('อัปเดตสำเร็จ');
      setEditSavedUser(null);
      fetchSavedUsers({ page: savedUsersPage });
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete saved user ──────────────────────────────────────────────────────
  const handleDeleteSavedUser = async (id) => {
    if (!window.confirm('ลบ user นี้หรือไม่?')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/generated-users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Delete failed');
      showAlert('ลบสำเร็จ');
      fetchSavedUsers({ page: savedUsersPage });
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Sync saved user to MikroTik ────────────────────────────────────────────
  const handleSyncSavedUser = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/generated-users/${id}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Sync failed');
      showAlert('Sync เข้า MikroTik สำเร็จ');
      fetchSavedUsers({ page: savedUsersPage });
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Sync selected saved users ──────────────────────────────────────────────
  const handleSyncSelectedSavedUsers = async () => {
    if (!selectedSavedUsers.length) { showAlert('ไม่มีรายการที่เลือก'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/generated-users/sync-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedSavedUsers }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Sync failed');
      showAlert(`Sync สำเร็จ ${result.synced?.length || 0} รายการ`);
      setSelectedSavedUsers([]);
      fetchSavedUsers({ page: savedUsersPage });
      fetchHotspotUsers();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Disable/Enable/Remove saved user from MikroTik ─────────────────────────
  const handleSavedUserMikrotikAction = async (id, action) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/generated-users/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `${action} failed`);
      showAlert(`${action} สำเร็จ`);
      fetchSavedUsers({ page: savedUsersPage });
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Print coupons from saved users ─────────────────────────────────────────
  const savedUsersForCoupon = savedUsers.filter((u) => selectedSavedUsers.includes(u.id));
  const handlePrintSavedCoupons = () => handlePrintCoupons(
    savedUsersForCoupon.length
      ? savedUsersForCoupon.map((u) => ({ username: u.username, password: u.password, profile: u.profile }))
      : savedUsers.map((u) => ({ username: u.username, password: u.password, profile: u.profile }))
  );

  const handleExportSavedCSV = () => {
    const data = (savedUsersForCoupon.length ? savedUsersForCoupon : savedUsers);
    handleExportExcel(data.map((u) => ({ username: u.username, password: u.password, profile: u.profile, comment: u.comment, status: u.status, batchLabel: u.batchLabel, expiryDate: u.expiryDate })));
  };

  const handlePrintCoupons = (usersToPrint = couponUsers) => {
    if (!usersToPrint.length) {
      showAlert('ยังไม่มีคูปองสำหรับพิมพ์');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      showAlert('Browser บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต pop-up');
      return;
    }

    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const slips = usersToPrint.map((user) => `
      <div class="coupon">
        <div class="brand">${escapeHtml(couponBrand || 'MT-API HOTSPOT')}</div>
        <div class="title">${escapeHtml(couponTitle || 'Internet Coupon Slip')}</div>
        <img class="qr" src="${getCouponQrUrl(user)}" alt="QR Code" />
        <div class="row"><span>Username</span><strong>${escapeHtml(user.username)}</strong></div>
        <div class="row"><span>Password</span><strong>${escapeHtml(user.password)}</strong></div>
        <div class="row"><span>Profile</span><strong>${escapeHtml(user.profile || 'default')}</strong></div>
        <div class="hint">Scan QR หรือเข้า ${escapeHtml(loginBaseUrl || 'Hotspot Login')}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(couponTitle || 'Hotspot Coupon Slips')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f3f4f6; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .coupon { background: #fff; border: 2px dashed #0f172a; border-radius: 16px; padding: 16px; text-align: center; page-break-inside: avoid; }
            .brand { font-size: 12px; color: #2563eb; font-weight: bold; letter-spacing: 1px; }
            .title { font-size: 20px; font-weight: bold; margin: 6px 0 12px; }
            .qr { width: 150px; height: 150px; object-fit: contain; margin: 0 auto 12px; }
            .row { display: flex; justify-content: space-between; font-size: 14px; margin: 6px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
            .hint { margin-top: 10px; font-size: 12px; color: #475569; }
            @media print {
              body { background: #fff; padding: 0; }
              .grid { gap: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="grid">${slips}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  const handleCopyCredentials = async (usersToCopy = couponUsers) => {
    if (!usersToCopy.length) {
      showAlert('ยังไม่มีรายการสำหรับ copy');
      return;
    }

    const credentialText = usersToCopy
      .map((user) => `Username: ${user.username} | Password: ${user.password} | Profile: ${user.profile || 'default'}`)
      .join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(credentialText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = credentialText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      showAlert(`คัดลอก username/password จำนวน ${usersToCopy.length} รายการแล้ว`);
    } catch (error) {
      showAlert('ไม่สามารถคัดลอกข้อมูลได้');
    }
  };

  const handleExportExcel = (usersToExport = couponUsers) => {
    if (!usersToExport.length) {
      showAlert('ยังไม่มีรายการสำหรับ export');
      return;
    }

    const rows = [
      ['Username', 'Password', 'Profile', 'Comment', 'LoginURL'],
      ...usersToExport.map((user) => [
        user.username,
        user.password,
        user.profile || 'default',
        user.comment || '',
        buildCouponLoginUrl(user),
      ]),
    ];

    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvContent = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    link.href = url;
    link.download = `hotspot-coupons-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showAlert(`Export Excel/CSV สำเร็จ ${usersToExport.length} รายการ`);
  };

  // --- MikroTik Direct User Handlers ---
  const handleMikrotikDirectAction = async (username, action) => {
    if (!guardAdminAction(canEditUsers, 'role นี้ยังไม่สามารถจัดการ MikroTik users ได้')) return;
    if (action === 'delete' && !window.confirm(`ลบ user "${username}" ออกจาก MikroTik หรือไม่?`)) return;

    const actionMap = {
      disable: { method: 'POST', url: `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(username)}/disable` },
      enable: { method: 'POST', url: `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(username)}/enable` },
      delete: { method: 'DELETE', url: `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(username)}` },
    };

    const cfg = actionMap[action];
    if (!cfg) return;

    setLoading(true);
    try {
      const res = await fetch(cfg.url, { method: cfg.method, headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `${action} failed`);
      showAlert(action === 'delete' ? 'ลบ user เรียบร้อยแล้ว' : action === 'disable' ? 'ปิดการใช้งานเรียบร้อยแล้ว' : 'เปิดการใช้งานเรียบร้อยแล้ว');
      await fetchHotspotUsers();
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMikrotikEditSave = async () => {
    if (!guardAdminAction(canEditUsers, 'role นี้ยังไม่สามารถแก้ไข MikroTik users ได้')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(mikrotikEditUser)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          password: mikrotikEditPayload.password || undefined,
          profile: mikrotikEditPayload.profile,
          comment: mikrotikEditPayload.comment,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Update failed');
      showAlert('แก้ไข MikroTik user เรียบร้อยแล้ว');
      setMikrotikEditUser(null);
      await fetchHotspotUsers();
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMikrotikAddUser = async () => {
    if (!guardAdminAction(canImportUsers, 'role นี้ยังไม่สามารถเพิ่ม MikroTik users ได้')) return;
    const { name, password, profile, comment } = addMikrotikPayload;
    if (!name.trim() || !password.trim()) {
      showAlert('กรุณากรอก Username และ Password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/mikrotik/hotspot-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), password: password.trim(), profile: profile || 'default', comment: comment || '' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Add failed');
      showAlert(`เพิ่ม user "${name}" ใน MikroTik เรียบร้อยแล้ว`);
      setShowAddMikrotikUser(false);
      setAddMikrotikPayload({ name: '', password: '', profile: 'default', comment: '' });
      await fetchHotspotUsers();
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (id, action) => {    if (!guardAdminAction(canEditUsers, 'role นี้ยังไม่สามารถเปิด/ปิดสถานะ user ได้')) return;
    const isDisable = action === 'disable';
    const confirmMessage = isDisable
      ? 'ต้องการปิดการใช้งาน user นี้หรือไม่?'
      : 'ต้องการเปิดการใช้งาน user นี้หรือไม่?';

    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requests/${id}/${action}-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `${action} failed`);

      showAlert(isDisable ? 'ปิดการใช้งานเรียบร้อยแล้ว' : 'เปิดการใช้งานเรียบร้อยแล้ว');
      fetchRequests();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = async (item) => {
    setEditId(item.id);
    setEditPayload({
      fullName: item.fullName,
      email: item.email,
      password: '',
      profile: item.profile,
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '',
    });
    await fetchProfiles();
  };

  const handleBulkApprove = async () => {
    if (!guardAdminAction(canApproveUsers, 'role นี้ยังไม่สามารถอนุมัติผู้ใช้ได้')) return;
    if (selectedPendingRequests.length === 0) return;
    if (!window.confirm(`อนุมัติ ${selectedPendingRequests.length} รายการที่เลือกหรือไม่?`)) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requests/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedPendingRequests }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Bulk approve failed');
      showAlert(`✅ อนุมัติสำเร็จ ${result.approved} รายการ${result.failed > 0 ? ` (ล้มเหลว ${result.failed})` : ''}`);
      setSelectedPendingRequests([]);
      fetchStats();
      fetchRequests();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!guardAdminAction(canEditUsers, 'role นี้ยังไม่สามารถแก้ไขผู้ใช้ได้')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requests/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editPayload,
          password: editPayload.password || undefined,
          expiryDate: editPayload.expiryDate || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Update failed');
      showAlert('แก้ไขข้อมูลเรียบร้อยแล้ว');
      setEditId(null);
      fetchStats();
      fetchRequests();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelApproval = async (id) => {
    if (!guardAdminAction(canApproveUsers, 'role นี้ยังไม่สามารถยกเลิกการอนุมัติได้')) return;
    if (!window.confirm('คุณแน่ใจหรือว่าต้องการยกเลิกการอนุมัติ?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requests/${id}/cancel-approval`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Cancel approval failed');
      
      if (result.mikrotikSuccess) {
        showAlert('✅ ยกเลิกสำเร็จ! ผู้ใช้ถูกลบออกจาก MikroTik แล้ว');
      } else {
        showAlert('⚠️ ยกเลิกสำเร็จ แต่ยังไม่ได้ลบออกจาก MikroTik');
      }
      
      setActiveTab('pending');
      await new Promise(resolve => setTimeout(resolve, 500));
      fetchStats();
      fetchRequests();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    // Registration form when not admin
    return (
      <div className="space-y-6">
        <section className="rounded-3xl bg-white p-8 shadow-lg">
          <h2 className="text-3xl font-bold mb-4">📝 สมัครใช้งาน</h2>
          <p className="text-gray-600 mb-6">กรุณากรอกข้อมูลเพื่อลงทะเบียน</p>
          
          <form className="space-y-4" onSubmit={handleRegister}>
            {/* Full Name & Username */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">ชื่อ-สกุล</span>
                <input
                  value={registerPayload.fullName}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, fullName: e.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Username</span>
                <input
                  value={registerPayload.username}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, username: e.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                />
              </label>
            </div>

            {/* Email & Password */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  value={registerPayload.email}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, email: e.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Password</span>
                <input
                  type="password"
                  value={registerPayload.password}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, password: e.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                />
              </label>
            </div>

            {/* ID Card & Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">เลขประจำตัวประชาชน</span>
                <input
                  value={registerPayload.idCardNumber}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, idCardNumber: e.target.value })}
                  placeholder="เช่น 1234567890123"
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  maxLength="13"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">เบอร์โทรศัพท์</span>
                <input
                  value={registerPayload.phoneNumber}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, phoneNumber: e.target.value })}
                  placeholder="เช่น 0812345678"
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                />
              </label>
            </div>

            {/* Position & Department */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">ตำแหน่ง</span>
                <select
                  value={registerPayload.position}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, position: e.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                >
                  <option value="">-- เลือกตำแหน่ง --</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">แผนก</span>
                <select
                  value={registerPayload.department}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, department: e.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                  required
                >
                  <option value="">-- เลือกแผนก --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Profile Plan */}
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Profile (Plan)</span>
              <select
                value={registerPayload.profile}
                onChange={(e) => setRegisterPayload({ ...registerPayload, profile: e.target.value })}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="default">Default</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </label>

            {/* Registration Code */}
            {codeRequired && (
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">🔐 รหัสการลงทะเบียน (5 หลัก)</span>
                <input
                  type="text"
                  value={registerPayload.registrationCode}
                  onChange={(e) => setRegisterPayload({ ...registerPayload, registrationCode: e.target.value })}
                  placeholder="เช่น 12345"
                  maxLength="5"
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white text-center text-2xl tracking-widest font-bold"
                  required
                />
                <p className="text-xs text-gray-500">กรุณากรอกรหัสการลงทะเบียน 5 หลัก</p>
              </label>
            )}

            {registrationConsent.enabled && (
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-cyan-950">📜 {registrationConsent.title}</h3>
                  <div className="mt-2 max-h-52 overflow-y-auto whitespace-pre-line rounded-xl bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-cyan-100">
                    {registrationConsent.content}
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-gray-800 ring-1 ring-cyan-100">
                  <input
                    type="checkbox"
                    checked={registerPayload.acceptedTerms}
                    onChange={(e) => setRegisterPayload({ ...registerPayload, acceptedTerms: e.target.checked })}
                    className="mt-1"
                    required={registrationConsent.enabled}
                  />
                  <span>{registrationConsent.checkboxLabel}</span>
                </label>

                {registrationConsent.requireAccuracyConfirmation && (
                  <label className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-gray-800 ring-1 ring-cyan-100">
                    <input
                      type="checkbox"
                      checked={registerPayload.acceptedAccuracy}
                      onChange={(e) => setRegisterPayload({ ...registerPayload, acceptedAccuracy: e.target.checked })}
                      className="mt-1"
                      required={registrationConsent.requireAccuracyConfirmation}
                    />
                    <span>{registrationConsent.accuracyLabel}</span>
                  </label>
                )}

                <p className="text-xs text-cyan-900">
                  ระบบอาจจัดเก็บข้อมูลจราจรทางคอมพิวเตอร์และข้อมูลส่วนบุคคลเท่าที่จำเป็นเพื่อยืนยันตัวตน อนุมัติสิทธิ์ และตรวจสอบย้อนหลังตามกฎหมาย
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
            >
              {loading ? 'กำลังส่ง...' : 'ลงทะเบียน'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="flex flex-col gap-6">
      {!canManageUsers && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          โหมด Viewer: ดูข้อมูลและรายงานได้ แต่จะไม่สามารถอนุมัติ แก้ไข ลบ หรือ import ผู้ใช้ได้
        </div>
      )}
      <div className="order-3 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🎟️ สร้าง / นำเข้า / พิมพ์คูปองผู้ใช้</h2>
            <p className="mt-1 text-sm text-gray-500">
              รองรับการ Generate, นำเข้าไฟล์ `.bat/.csv` และจัดการรายการผ่านแท็บ `Gen / Import` ด้านบน
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p>พร้อมพิมพ์คูปองพร้อม QR Code สำหรับใช้งาน login ได้ทันที</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-bold text-slate-900">1) Import จากไฟล์</h3>
            <p className="mt-1 text-sm text-slate-600">รองรับ `.bat`, `.txt`, `.csv`</p>
            <label className="mt-3 block space-y-2">
              <span className="text-sm font-medium text-gray-700">เลือกไฟล์นำเข้า</span>
              <input
                type="file"
                accept=".bat,.txt,.csv"
                onChange={handleBatchFileUpload}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700"
              />
            </label>
            <p className="mt-3 text-xs text-slate-500">
              ตัวอย่าง: `add name=USR001 password=1234 profile=default` หรือ `USR001,1234,default`
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-bold text-slate-900">2) Generate ผู้ใช้อัตโนมัติ</h3>
            <p className="mt-1 text-sm text-slate-600">กำหนดจำนวน Prefix และความยาว user/password ได้เอง</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">จำนวนที่ต้องการ</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={generateConfig.count}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, count: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Prefix Username</span>
                <input
                  value={generateConfig.prefix}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, prefix: e.target.value.toUpperCase() })}
                  placeholder="เช่น VIP"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">ความยาว Username</span>
                <input
                  type="number"
                  min="4"
                  max="32"
                  value={generateConfig.usernameLength}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, usernameLength: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">ความยาว Password</span>
                <input
                  type="number"
                  min="4"
                  max="32"
                  value={generateConfig.passwordLength}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, passwordLength: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">Profile จาก MikroTik</span>
                <select
                  value={generateConfig.profile}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, profile: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700"
                >
                  {profiles.length === 0 ? (
                    <option value="default">default</option>
                  ) : (
                    profiles.map((profile) => (
                      <option key={profile.name} value={profile.name}>
                        {profile.name}{profile.rateLimit ? ` (${profile.rateLimit})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-slate-500">ดึง profile จาก MikroTik อัตโนมัติ</p>
              </label>
            </div>

            <button
              onClick={handleGenerateBatchUsers}
              disabled={!canManageUsers || loading}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:bg-gray-400"
            >
              ✨ Generate Users
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Hotspot Login URL สำหรับ QR Code</span>
            <input
              value={loginBaseUrl}
              onChange={(e) => setLoginBaseUrl(e.target.value)}
              placeholder="เช่น http://192.168.10.1/login"
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">ชื่อแบรนด์บนคูปอง</span>
            <input
              value={couponBrand}
              onChange={(e) => setCouponBrand(e.target.value)}
              placeholder="เช่น COMPANY WIFI"
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700"
            />
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-medium text-gray-700">หัวข้อบนคูปอง</span>
            <input
              value={couponTitle}
              onChange={(e) => setCouponTitle(e.target.value)}
              placeholder="เช่น Free Wi-Fi Coupon"
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700"
            />
          </label>

          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 lg:col-span-2">
            <p className="font-semibold">พร้อมใช้งาน</p>
            <p className="mt-1">Preview ปัจจุบัน: <span className="font-bold">{batchUsers.length}</span> user</p>
            <p>กด Import แล้วจึงพิมพ์คูปอง QR เพื่อแจกได้ทันที</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleImportBatchUsers}
            disabled={!canManageUsers || loading || batchUsers.length === 0}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            ⬆️ Import เข้า MikroTik
          </button>
          <button
            onClick={handlePrintCoupons}
            disabled={couponUsers.length === 0}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-gray-400"
          >
            🧾 พิมพ์ / Export PDF
          </button>
          <button
            onClick={() => handleExportExcel(batchUsers)}
            disabled={batchUsers.length === 0}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
          >
            📊 Export Excel/CSV
          </button>
          <button
            onClick={() => handleCopyCredentials(batchUsers)}
            disabled={batchUsers.length === 0}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:bg-gray-400"
          >
            📋 Copy Username/Password
          </button>
          <button
            onClick={() => {
              setBatchUsers([]);
              setCouponUsers([]);
              setImportSummary(null);
            }}
            disabled={loading || (batchUsers.length === 0 && couponUsers.length === 0)}
            className="rounded-xl bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-gray-400"
          >
            ♻️ ล้างรายการ
          </button>
        </div>

        {/* Save to DB section */}
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-teal-50 p-4">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-sm font-medium text-teal-800">ชื่อ Batch (เพื่อจัดกลุ่ม)</label>
            <input
              value={batchLabelInput}
              onChange={(e) => setBatchLabelInput(e.target.value)}
              placeholder="เช่น Batch-Apr-2026 (ไม่บังคับ)"
              className="w-full rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm text-gray-700"
            />
          </div>
          <button
            onClick={() => handleSaveBatchToDB(batchUsers)}
            disabled={loading || batchUsers.length === 0}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-gray-400"
          >
            💾 บันทึกลง Database
          </button>
          <button
            onClick={() => { setActiveTab('saved'); fetchSavedUsers({ page: 1 }); }}
            className="rounded-xl bg-teal-100 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-200"
          >
            📂 ดูรายการที่บันทึกแล้ว →
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Preview ผู้ใช้ที่อ่านได้</p>
            <p className="mt-1">จำนวน: <span className="font-bold">{batchUsers.length}</span> รายการ</p>
            <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white">
              {batchUsers.length === 0 ? (
                <p className="p-4 text-gray-500">ยังไม่ได้เลือกไฟล์หรือ generate ผู้ใช้</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Password</th>
                      <th className="px-3 py-2">Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchUsers.map((user) => (
                      <tr key={user.username} className="border-t border-slate-100">
                        <td className="px-3 py-2">{user.username}</td>
                        <td className="px-3 py-2">{user.password}</td>
                        <td className="px-3 py-2">{user.profile}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">ผลการนำเข้า</p>
            {importSummary ? (
              <div className="mt-2 space-y-2">
                <p>สำเร็จ <span className="font-bold text-emerald-700">{importSummary.imported?.length || 0}</span> / {importSummary.total} รายการ</p>
                {(importSummary.failed?.length || 0) > 0 && (
                  <div className="rounded-lg bg-red-50 p-3 text-red-700">
                    <p className="font-semibold">รายการที่ไม่สำเร็จ</p>
                    <ul className="mt-1 list-disc pl-5">
                      {importSummary.failed.map((item, index) => (
                        <li key={`${item.username}-${index}`}>{item.username}: {item.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-gray-500">หลังนำเข้าแล้ว ระบบจะแสดงสรุปผลที่นี่</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="order-1 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white shadow-lg">
          <p className="text-sm font-medium opacity-80">ผู้ใช้ทั้งหมด</p>
          <p className="mt-2 text-4xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-700 p-6 text-white shadow-lg">
          <p className="text-sm font-medium opacity-90">รออนุมัติ</p>
          <p className="mt-2 text-4xl font-bold">{stats.pending}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-green-800 p-6 text-white shadow-lg">
          <p className="text-sm font-medium opacity-90">อนุมัติแล้ว</p>
          <p className="mt-2 text-4xl font-bold">{stats.approved}</p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="order-2 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-200">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">จัดการผู้ใช้งาน</h2>
              <p className="text-sm text-gray-500">อนุมัติ แก้ไข ควบคุมสถานะ และดูรายการ Gen / Import ได้จากส่วนนี้</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setActiveTab('pending')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'pending'
                    ? 'bg-yellow-500 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                รออนุมัติ ({stats.pending})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'approved'
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                อนุมัติแล้ว ({stats.approved})
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'batch'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Gen / Import ({batchUsers.length})
              </button>
              <button
                onClick={() => { setActiveTab('mikrotik'); fetchHotspotUsers(); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'mikrotik'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🐧 MikroTik Users ({hotspotUsers.length})
              </button>
              <button
                onClick={() => { setActiveTab('saved'); fetchSavedUsers({ page: 1 }); fetchBatchLabels(); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'saved'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                💾 บันทึกแล้ว ({savedUsersTotal})
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={activeTab === 'mikrotik' ? mikrotikSearchTerm : activeTab === 'saved' ? savedUsersSearch : searchTerm}
              onChange={(e) => {
                if (activeTab === 'mikrotik') setMikrotikSearchTerm(e.target.value);
                else if (activeTab === 'saved') { setSavedUsersSearch(e.target.value); fetchSavedUsers({ page: 1, search: e.target.value }); }
                else setSearchTerm(e.target.value);
              }}
              placeholder={activeTab === 'batch' ? 'ค้นหา username / password / profile' : activeTab === 'mikrotik' ? 'ค้นหา username / profile / comment' : activeTab === 'saved' ? 'ค้นหา username / batch label' : 'ค้นหาชื่อ / username / email / profile'}
              className="w-full max-w-xl rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                ทั้งหมด <span className="font-bold">{activeItems.length}</span> รายการ
              </span>
              <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                <span>ต่อหน้า</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-transparent font-semibold outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              {activeTab === 'batch' && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">
                  เลือกแล้ว <span className="font-bold">{selectedBatchUsers.length}</span> รายการ
                </span>
              )}
              {activeTab === 'pending' && selectedPendingRequests.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  disabled={loading}
                  className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-400"
                >
                  ✅ Approve ที่เลือก ({selectedPendingRequests.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'saved' ? (
          <div className="space-y-4 p-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-teal-50 p-3 text-sm">
              <select
                value={savedUsersTypeFilter}
                onChange={(e) => { setSavedUsersTypeFilter(e.target.value); fetchSavedUsers({ page: 1, type: e.target.value }); }}
                className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="all">ทุกประเภท</option>
                <option value="generated">🔧 Generated</option>
                <option value="imported">📂 Imported</option>
              </select>
              <select
                value={savedUsersStatusFilter}
                onChange={(e) => { setSavedUsersStatusFilter(e.target.value); fetchSavedUsers({ page: 1, status: e.target.value }); }}
                className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="generated">Generated</option>
                <option value="synced">Synced</option>
                <option value="disabled">Disabled</option>
                <option value="removed">Removed</option>
              </select>
              <select
                value={savedUsersBatchFilter}
                onChange={(e) => { setSavedUsersBatchFilter(e.target.value); fetchSavedUsers({ page: 1, batchLabel: e.target.value }); }}
                className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="all">ทุก Batch</option>
                {batchLabels.map((label) => <option key={label} value={label}>{label}</option>)}
              </select>
              <button onClick={() => fetchSavedUsers({ page: savedUsersPage })} disabled={loading} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-teal-700 ring-1 ring-teal-200">🔄 Refresh</button>
              {selectedSavedUsers.length > 0 && (
                <button onClick={handleSyncSelectedSavedUsers} disabled={loading} className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">
                  ⬆️ Sync ที่เลือก ({selectedSavedUsers.length}) → MikroTik
                </button>
              )}
              {selectedSavedUsers.length > 0 && (
                <button onClick={handlePrintSavedCoupons} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">🧾 พิมพ์ที่เลือก</button>
              )}
              {selectedSavedUsers.length > 0 && (
                <button onClick={handleExportSavedCSV} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700">📊 Export CSV</button>
              )}
              {savedUsers.length > 0 && selectedSavedUsers.length === 0 && (
                <button onClick={handlePrintSavedCoupons} className="rounded-lg bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-200">🧾 พิมพ์ทั้งหมด</button>
              )}
              {savedUsers.length > 0 && selectedSavedUsers.length === 0 && (
                <button onClick={handleExportSavedCSV} className="rounded-lg bg-indigo-100 px-3 py-1.5 font-semibold text-indigo-800 hover:bg-indigo-200">📊 Export ทั้งหมด</button>
              )}
              <span className="ml-auto rounded-full bg-white px-3 py-1 text-teal-700 ring-1 ring-teal-200">
                ทั้งหมด <span className="font-bold">{savedUsersTotal}</span> รายการ
              </span>
            </div>

            {savedUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-500">ยังไม่มีรายการที่บันทึกไว้</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-black">
                    <thead className="bg-teal-50 text-gray-900">
                      <tr>
                        <th className="px-4 py-3">
                          <input type="checkbox"
                            checked={savedUsers.length > 0 && selectedSavedUsers.length === savedUsers.length}
                            onChange={(e) => setSelectedSavedUsers(e.target.checked ? savedUsers.map((u) => u.id) : [])}
                            className="h-4 w-4"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold">Username</th>
                        <th className="px-4 py-3 font-semibold">Password</th>
                        <th className="px-4 py-3 font-semibold">Profile</th>
                        <th className="px-4 py-3 font-semibold">ประเภท</th>
                        <th className="px-4 py-3 font-semibold">Batch</th>
                        <th className="px-4 py-3 font-semibold">สถานะ DB</th>
                        <th className="px-4 py-3 font-semibold">สถานะ MikroTik</th>
                        <th className="px-4 py-3 font-semibold">วันหมดอายุ</th>
                        <th className="px-4 py-3 font-semibold">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {savedUsers.map((u) => {
                        const statusBadge = {
                          generated: 'bg-slate-100 text-slate-700',
                          synced: 'bg-green-100 text-green-800',
                          disabled: 'bg-amber-100 text-amber-800',
                          removed: 'bg-red-100 text-red-700',
                        }[u.status] || 'bg-gray-100 text-gray-700';
                        const mikrotikBadge = u.mikrotikExists === false ? 'bg-slate-100 text-slate-600' : u.mikrotikDisabled ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';
                        const mikrotikLabel = u.mikrotikExists === false ? '📝 ยังไม่ Sync' : u.mikrotikDisabled ? '⛔ Disabled' : '🟢 Active';
                        return (
                          <tr key={u.id} className="hover:bg-teal-50/30 align-top">
                            <td className="px-4 py-3">
                              <input type="checkbox"
                                checked={selectedSavedUsers.includes(u.id)}
                                onChange={(e) => setSelectedSavedUsers(e.target.checked ? [...selectedSavedUsers, u.id] : selectedSavedUsers.filter((id) => id !== u.id))}
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="px-4 py-3 font-medium">{u.username}</td>
                            <td className="px-4 py-3 font-mono text-xs">{u.password}</td>
                            <td className="px-4 py-3">{u.profile}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                u.type === 'imported' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {u.type === 'imported' ? '📂 Import' : '🔧 Gen'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{u.batchLabel || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge}`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${mikrotikBadge}`}>
                                {mikrotikLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs">{u.expiryDate || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => { setEditSavedUser(u); setEditSavedPayload({ password: u.password, profile: u.profile, comment: u.comment || '', fullName: u.fullName || '', expiryDate: u.expiryDate || '', batchLabel: u.batchLabel || '' }); }}
                                  className="rounded bg-cyan-500 px-2 py-1 text-xs font-semibold text-white hover:bg-cyan-600">✏️ Edit</button>
                                {u.status === 'generated' && (
                                  <button onClick={() => handleSyncSavedUser(u.id)} disabled={loading}
                                    className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">⬆️ Sync</button>
                                )}
                                {u.mikrotikExists && !u.mikrotikDisabled && (
                                  <button onClick={() => handleSavedUserMikrotikAction(u.id, 'disable')} disabled={loading}
                                    className="rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:bg-gray-400">⛔ Disable</button>
                                )}
                                {u.mikrotikExists && u.mikrotikDisabled && (
                                  <button onClick={() => handleSavedUserMikrotikAction(u.id, 'enable')} disabled={loading}
                                    className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-400">🟢 Enable</button>
                                )}
                                {u.mikrotikExists && (
                                  <button onClick={() => handleSavedUserMikrotikAction(u.id, 'remove-mikrotik')} disabled={loading}
                                    className="rounded bg-orange-600 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-700 disabled:bg-gray-400">🗑️ Remove MK</button>
                                )}
                                <button onClick={() => handlePrintCoupons([{ username: u.username, password: u.password, profile: u.profile }])}
                                  className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200">🧾 QR</button>
                                {canDeleteUsers && (
                                  <button onClick={() => handleDeleteSavedUser(u.id)} disabled={loading}
                                    className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-gray-400">🗑️ ลบ</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {savedUsersTotal > 20 && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-600">หน้า <span className="font-semibold">{savedUsersPage}</span> · รวม <span className="font-semibold">{savedUsersTotal}</span> รายการ</p>
                    <div className="flex gap-2">
                      <button onClick={() => fetchSavedUsers({ page: savedUsersPage - 1 })} disabled={savedUsersPage <= 1} className="rounded-lg border bg-white px-3 py-1.5 text-sm disabled:opacity-50">ก่อนหน้า</button>
                      <button onClick={() => fetchSavedUsers({ page: savedUsersPage + 1 })} disabled={savedUsersPage * 20 >= savedUsersTotal} className="rounded-lg border bg-white px-3 py-1.5 text-sm disabled:opacity-50">ถัดไป</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'mikrotik' ? (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm">
              <button
                onClick={() => fetchHotspotUsers()}
                disabled={loading}
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
              >
                🔄 Refresh จาก MikroTik
              </button>
              {canImportUsers && (
                <button
                  onClick={() => { setShowAddMikrotikUser(true); fetchProfiles(); }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                >
                  ➕ เพิ่ม User ใหม่
                </button>
              )}
              <span className="ml-auto rounded-full bg-white px-3 py-1 text-rose-700 ring-1 ring-rose-200">
                ทั้งหมด <span className="font-bold">{filteredMikrotikUsers.length}</span> รายการ
              </span>
            </div>

            {filteredMikrotikUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {loading ? 'กำลังโหลด...' : 'ไม่พบ user บน MikroTik'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-black">
                    <thead className="bg-rose-50 text-gray-900">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Username</th>
                        <th className="px-4 py-3 font-semibold">Profile</th>
                        <th className="px-4 py-3 font-semibold">สถานะ</th>
                        <th className="px-4 py-3 font-semibold">Last Login</th>
                        <th className="px-4 py-3 font-semibold">Comment</th>
                        <th className="px-4 py-3 font-semibold">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedMikrotikUsers.map((u) => (
                        <tr key={u.id || u.name} className={`align-top hover:bg-rose-50/30 ${u.disabled ? 'bg-amber-50/30' : 'bg-green-50/20'}`}>
                          <td className="px-4 py-3 font-medium">{u.name}</td>
                          <td className="px-4 py-3">{u.profile || 'default'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${u.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {u.disabled ? '🔴 Disabled' : '🟢 Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{u['last-login'] || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{u.comment || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {canEditUsers && (
                                <button
                                  onClick={() => {
                                    setMikrotikEditUser(u.name);
                                    setMikrotikEditPayload({ password: '', profile: u.profile || 'default', comment: u.comment || '' });
                                    fetchProfiles();
                                  }}
                                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600"
                                >
                                  ✏️ Edit
                                </button>
                              )}
                              {canEditUsers && (
                                <button
                                  onClick={() => handleMikrotikDirectAction(u.name, u.disabled ? 'enable' : 'disable')}
                                  disabled={loading}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:bg-gray-400 ${u.disabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                                >
                                  {u.disabled ? '🟢 Enable' : '⛔ Disable'}
                                </button>
                              )}
                              {canDeleteUsers && (
                                <button
                                  onClick={() => handleMikrotikDirectAction(u.name, 'delete')}
                                  disabled={loading}
                                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-gray-400"
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredMikrotikUsers.length > mikrotikItemsPerPage && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-600">
                      หน้า <span className="font-semibold">{safeMikrotikPage}</span> / <span className="font-semibold">{mikrotikTotalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setMikrotikPage((p) => Math.max(1, p - 1))} disabled={safeMikrotikPage === 1} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-black disabled:opacity-50">ก่อนหน้า</button>
                      <button onClick={() => setMikrotikPage((p) => Math.min(mikrotikTotalPages, p + 1))} disabled={safeMikrotikPage === mikrotikTotalPages} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-black disabled:opacity-50">ถัดไป</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'batch' ? (
          batchUsers.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              ยังไม่มีรายการจากการ Generate หรือ Import ไฟล์
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm">
                <button
                  onClick={toggleAllFilteredBatchUsers}
                  className="rounded-lg bg-white px-3 py-1.5 font-semibold text-violet-700 ring-1 ring-violet-200"
                >
                  {allFilteredBatchSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
                <button
                  onClick={() => handleImportBatchUsers(selectedBatchItems.length ? selectedBatchItems : filteredBatchUsers)}
                  disabled={loading || (selectedBatchItems.length === 0 && filteredBatchUsers.length === 0)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  ⬆️ Import รายการที่เลือก
                </button>
                <button
                  onClick={() => handlePrintCoupons(selectedBatchItems.length ? selectedBatchItems : filteredBatchUsers)}
                  disabled={selectedBatchItems.length === 0 && filteredBatchUsers.length === 0}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  🧾 Print / PDF
                </button>
                <button
                  onClick={() => handleExportExcel(selectedBatchItems.length ? selectedBatchItems : filteredBatchUsers)}
                  disabled={selectedBatchItems.length === 0 && filteredBatchUsers.length === 0}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  📊 Export Excel
                </button>
                <button
                  onClick={() => handleCopyCredentials(selectedBatchItems.length ? selectedBatchItems : filteredBatchUsers)}
                  disabled={selectedBatchItems.length === 0 && filteredBatchUsers.length === 0}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  📋 Copy User/Pass
                </button>
                <button
                  onClick={() => handleBatchBulkRouterAction('disable')}
                  disabled={loading || selectedBatchItems.length === 0}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  ⛔ Disable Selected
                </button>
                <button
                  onClick={() => handleBatchBulkRouterAction('enable')}
                  disabled={loading || selectedBatchItems.length === 0}
                  className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  🟢 Enable Selected
                </button>
                <button
                  onClick={() => handleBatchBulkRouterAction('delete')}
                  disabled={loading || selectedBatchItems.length === 0}
                  className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  🗑️ Delete Selected
                </button>
                <button
                  onClick={removeSelectedBatchUsers}
                  disabled={loading || selectedBatchUsers.length === 0}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 font-semibold text-white disabled:bg-gray-400"
                >
                  ❌ Remove from List
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-black">
                  <thead className="bg-violet-50 text-gray-900">
                    <tr>
                      <th className="px-4 py-3 font-semibold">เลือก</th>
                      <th className="px-4 py-3 font-semibold">Username</th>
                      <th className="px-4 py-3 font-semibold">Password</th>
                      <th className="px-4 py-3 font-semibold">Profile</th>
                      <th className="px-4 py-3 font-semibold">ประเภท</th>
                      <th className="px-4 py-3 font-semibold">สถานะ MikroTik</th>
                      <th className="px-4 py-3 font-semibold">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-black">
                    {paginatedBatchUsers.map((user) => {
                      const index = batchUsers.findIndex((item) => item.username === user.username);
                      const routerUser = hotspotUserMap.get(user.username);
                      const routerDisabled = routerUser?.disabled === true;

                      return (
                        <tr key={`${user.username}-${index}`} className="hover:bg-violet-50/40 align-top">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedBatchUsers.includes(user.username)}
                              onChange={() => toggleBatchUserSelection(user.username)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={user.username}
                              onChange={(e) => updateBatchUser(index, 'username', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={user.password}
                              onChange={(e) => updateBatchUser(index, 'password', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={user.profile || 'default'}
                              onChange={(e) => updateBatchUser(index, 'profile', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                            >
                              {profiles.length === 0 ? (
                                <option value="default">default</option>
                              ) : (
                                profiles.map((profile) => (
                                  <option key={profile.name} value={profile.name}>
                                    {profile.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              (user.sourceType || user.type) === 'imported' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {(user.sourceType || user.type) === 'imported' ? '📂 Import' : '🔧 Gen'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                routerUser
                                  ? routerDisabled
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {routerUser ? (routerDisabled ? '⛔ Disabled' : '🟢 Active') : '📝 Ready to import'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {routerUser && (
                                <button
                                  onClick={() => handleBatchRouterUserAction(user, routerDisabled ? 'enable' : 'disable')}
                                  disabled={loading}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:bg-gray-400 ${
                                    routerDisabled
                                      ? 'bg-emerald-600 hover:bg-emerald-700'
                                      : 'bg-amber-600 hover:bg-amber-700'
                                  }`}
                                >
                                  {routerDisabled ? '🟢 Enable' : '⛔ Disable'}
                                </button>
                              )}
                              {routerUser && (
                                <button
                                  onClick={() => handleBatchRouterUserAction(user, 'delete')}
                                  disabled={loading}
                                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:bg-gray-400"
                                >
                                  🗑️ Delete Router
                                </button>
                              )}
                              <button
                                onClick={() => removeBatchUser(index)}
                                disabled={loading}
                                className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:bg-gray-400"
                              >
                                ❌ Remove List
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : filteredRequests.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {activeTab === 'pending' ? 'ยังไม่มีรายการรออนุมัติ' : 'ยังไม่มีผู้ใช้ที่อนุมัติแล้ว'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-black">
              <thead className="bg-gray-50 text-gray-900">
                <tr>
                  {activeTab === 'pending' && (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedPendingRequests.length > 0 && selectedPendingRequests.length === filteredRequests.length}
                        onChange={(e) => setSelectedPendingRequests(e.target.checked ? filteredRequests.map((r) => r.id) : [])}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 font-semibold">ชื่อ</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Profile</th>
                  <th className="px-4 py-3 font-semibold">สถานะ MikroTik</th>
                  <th className="px-4 py-3 font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-black">
                {paginatedRequests.map((item) => {
                  const mikrotikStatus = getMikrotikStatus(item);

                  return (
                    <tr key={item.id} className={`text-black align-top hover:bg-gray-50 ${
                      activeTab === 'pending'
                        ? 'bg-yellow-50/30'
                        : item.mikrotikDisabled
                          ? 'bg-amber-50/40'
                          : 'bg-green-50/30'
                    }`}>
                      {activeTab === 'pending' && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedPendingRequests.includes(item.id)}
                            onChange={(e) => setSelectedPendingRequests(e.target.checked
                              ? [...selectedPendingRequests, item.id]
                              : selectedPendingRequests.filter((id) => id !== item.id)
                            )}
                          />
                        </td>
                      )}
                      <td className="px-4 py-4 font-medium">{item.fullName}</td>
                      <td className="px-4 py-4">{item.username}</td>
                      <td className="px-4 py-4">{item.email}</td>
                      <td className="px-4 py-4">{item.profile}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${mikrotikStatus.className}`}>
                          {mikrotikStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-600"
                          >
                            ✏️ Edit
                          </button>

                          {activeTab === 'pending' ? (
                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={loading}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:bg-gray-400"
                            >
                              ✅ Approve
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleUserStatus(item.id, item.mikrotikDisabled ? 'enable' : 'disable')}
                                disabled={loading || item.mikrotikExists === false}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:bg-gray-400 ${
                                  item.mikrotikDisabled
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                              >
                                {item.mikrotikDisabled ? '🟢 Enable' : '⛔ Disable'}
                              </button>
                              <button
                                onClick={() => handleCancelApproval(item.id)}
                                disabled={loading}
                                className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:bg-gray-400"
                              >
                                ↩️ Pending
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => {
                              if (window.confirm('ลบข้อมูลนี้หรือไม่?')) {
                                handleDelete(item.id);
                              }
                            }}
                            disabled={loading}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:bg-gray-400"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab !== 'mikrotik' && activeItems.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              แสดง <span className="font-semibold">{pageStart}-{pageEnd}</span> จาก <span className="font-semibold">{activeItems.length}</span> รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <span className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
                หน้า {safeCurrentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl text-black">
            <h3 className="text-2xl font-bold text-black">แก้ไขข้อมูล</h3>
            <form className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">ชื่อ-สกุล</span>
                <input
                  type="text"
                  value={editPayload.fullName}
                  onChange={(e) => setEditPayload({ ...editPayload, fullName: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Email</span>
                <input
                  type="email"
                  value={editPayload.email}
                  onChange={(e) => setEditPayload({ ...editPayload, email: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">รหัสผ่านใหม่</span>
                <input
                  type="password"
                  value={editPayload.password}
                  onChange={(e) => setEditPayload({ ...editPayload, password: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                  placeholder="เว้นว่างเพื่อไม่เปลี่ยน"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Profile ({profiles.length} available)</span>
                <select
                  value={editPayload.profile}
                  onChange={(e) => setEditPayload({ ...editPayload, profile: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                >
                  <option value="">-- เลือก Profile --</option>
                  {profiles && profiles.length > 0 ? (
                    profiles.map((p) => (
                      <option key={p.name} value={p.name} className="text-black bg-white">
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="default">default</option>
                      <option value="admin">admin</option>
                      <option value="user">user</option>
                    </>
                  )}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">วันหมดอายุ (ว/ด/ป) — เว้นว่างเพื่อไม่กำหนด</span>
                <input
                  type="date"
                  value={editPayload.expiryDate}
                  onChange={(e) => setEditPayload({ ...editPayload, expiryDate: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                />
              </label>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="flex-1 rounded bg-gray-300 hover:bg-gray-400 px-4 py-2 font-semibold transition text-black"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="flex-1 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold transition"
                >
                  {loading ? 'บันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Saved User Modal */}
      {editSavedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl text-black">
            <h3 className="text-xl font-bold text-black">✏️ แก้ไข Generated User: {editSavedUser.username}</h3>
            <form className="mt-4 space-y-4">
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-black">Password</span>
                <input type="text" value={editSavedPayload.password}
                  onChange={(e) => setEditSavedPayload({ ...editSavedPayload, password: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white" />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-black">Profile</span>
                <select value={editSavedPayload.profile}
                  onChange={(e) => setEditSavedPayload({ ...editSavedPayload, profile: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white">
                  {profiles.length === 0 ? <option value="default">default</option>
                    : profiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-black">Batch Label</span>
                <input type="text" value={editSavedPayload.batchLabel}
                  onChange={(e) => setEditSavedPayload({ ...editSavedPayload, batchLabel: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                  placeholder="ชื่อ batch" />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-black">วันหมดอายุ</span>
                <input type="date" value={editSavedPayload.expiryDate}
                  onChange={(e) => setEditSavedPayload({ ...editSavedPayload, expiryDate: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white" />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-black">Comment</span>
                <input type="text" value={editSavedPayload.comment}
                  onChange={(e) => setEditSavedPayload({ ...editSavedPayload, comment: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white" />
              </label>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setEditSavedUser(null)} className="flex-1 rounded bg-gray-300 hover:bg-gray-400 px-4 py-2 font-semibold text-black">ยกเลิก</button>
                <button type="button" onClick={handleSaveEditSavedUser} disabled={loading} className="flex-1 rounded bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold">
                  {loading ? 'บันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MikroTik Edit User Modal */}
      {mikrotikEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl text-black">
            <h3 className="text-2xl font-bold text-black">✏️ แก้ไข MikroTik User: {mikrotikEditUser}</h3>
            <form className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">รหัสผ่านใหม่ (เว้นว่างเพื่อไม่เปลี่ยน)</span>
                <input
                  type="password"
                  value={mikrotikEditPayload.password}
                  onChange={(e) => setMikrotikEditPayload({ ...mikrotikEditPayload, password: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                  placeholder="ใส่รหัสผ่านใหม่"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Profile</span>
                <select
                  value={mikrotikEditPayload.profile}
                  onChange={(e) => setMikrotikEditPayload({ ...mikrotikEditPayload, profile: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                >
                  {profiles.length === 0 ? (
                    <option value="default">default</option>
                  ) : (
                    profiles.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))
                  )}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Comment</span>
                <input
                  type="text"
                  value={mikrotikEditPayload.comment}
                  onChange={(e) => setMikrotikEditPayload({ ...mikrotikEditPayload, comment: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                  placeholder="หมายเหตุ"
                />
              </label>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setMikrotikEditUser(null)} className="flex-1 rounded bg-gray-300 hover:bg-gray-400 px-4 py-2 font-semibold transition text-black">ยกเลิก</button>
                <button type="button" onClick={handleMikrotikEditSave} disabled={loading} className="flex-1 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold transition">
                  {loading ? 'บันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add MikroTik User Modal */}
      {showAddMikrotikUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl text-black">
            <h3 className="text-2xl font-bold text-black">➕ เพิ่ม User ใหม่ใน MikroTik</h3>
            <form className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Username *</span>
                <input
                  type="text"
                  value={addMikrotikPayload.name}
                  onChange={(e) => setAddMikrotikPayload({ ...addMikrotikPayload, name: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                  placeholder="เช่น user001"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Password *</span>
                <input
                  type="text"
                  value={addMikrotikPayload.password}
                  onChange={(e) => setAddMikrotikPayload({ ...addMikrotikPayload, password: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                  placeholder="รหัสผ่าน"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Profile</span>
                <select
                  value={addMikrotikPayload.profile}
                  onChange={(e) => setAddMikrotikPayload({ ...addMikrotikPayload, profile: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                >
                  {profiles.length === 0 ? (
                    <option value="default">default</option>
                  ) : (
                    profiles.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))
                  )}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Comment</span>
                <input
                  type="text"
                  value={addMikrotikPayload.comment}
                  onChange={(e) => setAddMikrotikPayload({ ...addMikrotikPayload, comment: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-black bg-white"
                  placeholder="หมายเหตุ (ไม่บังคับ)"
                />
              </label>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowAddMikrotikUser(false)} className="flex-1 rounded bg-gray-300 hover:bg-gray-400 px-4 py-2 font-semibold transition text-black">ยกเลิก</button>
                <button type="button" onClick={handleMikrotikAddUser} disabled={loading} className="flex-1 rounded bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white font-semibold transition">
                  {loading ? 'กำลังเพิ่ม...' : 'เพิ่ม User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementComponent;
