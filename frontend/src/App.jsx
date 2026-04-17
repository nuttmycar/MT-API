import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import SystemStatus from './components/SystemStatus';
import Settings from './components/Settings';
import ReportsCenter from './components/ReportsCenter';
import MikroTikDashboard from './components/MikroTikDashboard';
import AccessControlManager from './components/AccessControlManager';
import VersionInfo from './components/VersionInfo';

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

const getDefaultPermissionsForRole = (role = 'guest') => {
  const sectionPermissions = ({
    super_admin: {
      users: true,
      system: true,
      reports: true,
      mikrotik: true,
      'ip-binding': true,
      'walled-garden': true,
      settings: true,
      'access-control': true,
    },
    admin: {
      users: true,
      system: true,
      reports: true,
      mikrotik: true,
      'ip-binding': true,
      'walled-garden': true,
      settings: true,
      'access-control': false,
    },
    viewer: {
      users: true,
      system: true,
      reports: true,
      mikrotik: false,
      'ip-binding': false,
      'walled-garden': false,
      settings: false,
      'access-control': false,
    },
  }[role] || {
    users: false,
    system: false,
    reports: true,
    mikrotik: false,
    'ip-binding': false,
    'walled-garden': false,
    settings: false,
    'access-control': false,
  });

  const allowAdminManage = role === 'super_admin' || role === 'admin';

  return {
    ...sectionPermissions,
    actions: {
      users: {
        view: !!sectionPermissions.users,
        approve: allowAdminManage,
        edit: allowAdminManage,
        delete: allowAdminManage,
        import: allowAdminManage,
      },
      system: {
        view: !!sectionPermissions.system,
      },
      reports: {
        view: !!sectionPermissions.reports,
        export: allowAdminManage,
        backup: allowAdminManage,
      },
      mikrotik: {
        view: !!sectionPermissions.mikrotik,
        manage: allowAdminManage && !!sectionPermissions.mikrotik,
      },
      'ip-binding': {
        view: !!sectionPermissions['ip-binding'],
        manage: allowAdminManage && !!sectionPermissions['ip-binding'],
      },
      'walled-garden': {
        view: !!sectionPermissions['walled-garden'],
        manage: allowAdminManage && !!sectionPermissions['walled-garden'],
      },
      settings: {
        view: !!sectionPermissions.settings,
        update: allowAdminManage && !!sectionPermissions.settings,
        test: allowAdminManage && !!sectionPermissions.settings,
      },
      'access-control': {
        view: role === 'super_admin',
        roles: role === 'super_admin',
        users: role === 'super_admin',
        history: role === 'super_admin',
      },
    },
  };
};

const normalizePermissions = (permissions = {}, role = 'guest') => {
  const defaults = getDefaultPermissionsForRole(role);
  const sections = ['users', 'system', 'reports', 'mikrotik', 'ip-binding', 'walled-garden', 'settings', 'access-control'];

  return sections.reduce((acc, sectionKey) => {
    acc[sectionKey] = typeof permissions?.[sectionKey] === 'boolean' ? permissions[sectionKey] : defaults[sectionKey];
    acc.actions = acc.actions || {};
    acc.actions[sectionKey] = {
      ...(defaults.actions?.[sectionKey] || {}),
      ...(permissions?.actions?.[sectionKey] || {}),
    };
    return acc;
  }, { ...defaults, ...permissions, actions: {} });
};

const decodeStoredAuth = (storedToken) => {
  if (!storedToken) {
    return {
      role: 'guest',
      permissions: getDefaultPermissionsForRole('guest'),
    };
  }

  try {
    const payload = JSON.parse(window.atob(storedToken.split('.')[1]));
    const role = payload?.role || localStorage.getItem('mt_api_role') || 'guest';
    const storedPermissions = localStorage.getItem('mt_api_permissions');

    return {
      role,
      permissions: normalizePermissions(payload?.permissions || (storedPermissions ? JSON.parse(storedPermissions) : getDefaultPermissionsForRole(role)), role),
    };
  } catch (error) {
    const role = localStorage.getItem('mt_api_role') || 'guest';
    const storedPermissions = localStorage.getItem('mt_api_permissions');
    return {
      role,
      permissions: normalizePermissions(storedPermissions ? JSON.parse(storedPermissions) : getDefaultPermissionsForRole(role), role),
    };
  }
};

const getFirstAllowedSection = (permissions = {}) => (
  ['users', 'system', 'reports', 'mikrotik', 'ip-binding', 'walled-garden', 'settings', 'access-control']
    .find((key) => permissions?.[key]) || 'reports'
);

const formatRoleLabel = (role) => ({
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
}[role] || role || 'Guest');

function App() {
  const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000/api`;
  const initialToken = localStorage.getItem('mt_api_token');
  const initialAuth = decodeStoredAuth(initialToken);
  const [token, setToken] = useState(initialToken);
  const [userRole, setUserRole] = useState(initialAuth.role);
  const [menuPermissions, setMenuPermissions] = useState(initialAuth.permissions);
  const [isAdmin, setIsAdmin] = useState(!!initialToken);
  const [alert, setAlert] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('users');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [branding, setBranding] = useState(DEFAULT_APP_BRANDING);

  // Log state changes for debugging
  useEffect(() => {
    console.log('[STATE] Current login state:', { username, password });
  }, [username, password]);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch(`${API_BASE}/settings/branding/public`);
        const data = await response.json();
        if (response.ok) {
          setBranding({ ...DEFAULT_APP_BRANDING, ...data });
        }
      } catch (error) {
        console.error('[Branding] Error fetching branding:', error);
      }
    };

    fetchBranding();
  }, [API_BASE]);

  useEffect(() => {
    if (!token) {
      setMenuPermissions(getDefaultPermissionsForRole('guest'));
      return;
    }

    const syncProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();
        if (response.ok) {
          const nextRole = result.role || 'guest';
          const nextPermissions = normalizePermissions(result.permissions || getDefaultPermissionsForRole(nextRole), nextRole);
          setUserRole(nextRole);
          setMenuPermissions(nextPermissions);
          localStorage.setItem('mt_api_role', nextRole);
          localStorage.setItem('mt_api_permissions', JSON.stringify(nextPermissions));
        }
      } catch (error) {
        console.error('[Auth] Failed to sync profile:', error);
      }
    };

    syncProfile();
  }, [token, API_BASE]);

  useEffect(() => {
    if (!isAdmin) return;

    if (activeSection && !menuPermissions?.[activeSection]) {
      setActiveSection(getFirstAllowedSection(menuPermissions));
    }
  }, [isAdmin, menuPermissions, activeSection]);

  useEffect(() => {
    const pageTitle = (isAdmin
      ? (branding.browserTitle || branding.dashboardTitle || branding.appName)
      : (branding.browserTitle || branding.appName || DEFAULT_APP_BRANDING.browserTitle)
    ).trim();

    document.title = pageTitle || DEFAULT_APP_BRANDING.browserTitle;

    const faviconHref = branding.faviconUrl || branding.logoUrl;
    let faviconLink = document.querySelector("link[rel='icon']");

    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.setAttribute('rel', 'icon');
      document.head.appendChild(faviconLink);
    }

    if (faviconHref) {
      faviconLink.setAttribute('href', faviconHref);
    }
  }, [branding, isAdmin]);

  const showAlert = (message) => {
    setAlert(message);
    setTimeout(() => setAlert(''), 4000);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    console.log('[LOGIN] ========== FORM SUBMITTED ==========');
    console.log('[LOGIN] Event:', event);
    console.log('[LOGIN] Event type:', event.type);
    console.log('[LOGIN] Current username:', username);
    console.log('[LOGIN] Current password:', password);
    console.log('[LOGIN] Username type:', typeof username);
    console.log('[LOGIN] Password type:', typeof password);
    console.log('[LOGIN] Username length:', username?.length || 0);
    console.log('[LOGIN] Password length:', password?.length || 0);
    
    if (!username || !password || username.length === 0 || password.length === 0) {
      console.log('[LOGIN] ❌ VALIDATION FAILED - empty username or password');
      console.log('[LOGIN] Username empty?', !username || username.length === 0);
      console.log('[LOGIN] Password empty?', !password || password.length === 0);
      showAlert('Username and password are required');
      return;
    }
    
    console.log('[LOGIN] ✓ VALIDATION PASSED');
    setLoading(true);

    try {
      const url = `${API_BASE}/auth/login`;
      const payload = { username, password };
      console.log('[LOGIN] Sending request to:', url);
      console.log('[LOGIN] Payload:', payload);
      console.log('[LOGIN] Payload as JSON string:', JSON.stringify(payload));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[LOGIN] Response status:', response.status);
      console.log('[LOGIN] Response headers:', response.headers);

      const result = await response.json();
      console.log('[LOGIN] Response body:', result);

      if (!response.ok) {
        throw new Error(result.message || `Login failed (${response.status})`);
      }

      const nextRole = result.role || 'super_admin';
      const nextPermissions = result.permissions || getDefaultPermissionsForRole(nextRole);

      localStorage.setItem('mt_api_token', result.token);
      localStorage.setItem('mt_api_role', nextRole);
      localStorage.setItem('mt_api_permissions', JSON.stringify(nextPermissions));
      setToken(result.token);
      setUserRole(nextRole);
      setMenuPermissions(nextPermissions);
      setIsAdmin(true);
      setActiveSection(getFirstAllowedSection(nextPermissions));
      setUsername('');
      setPassword('');
      showAlert('เข้าสู่ระบบสำเร็จ');
      console.log('[LOGIN] ✓ Login successful');
    } catch (error) {
      console.error('[LOGIN] ❌ Error:', error);
      showAlert(`Login error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mt_api_token');
    localStorage.removeItem('mt_api_role');
    localStorage.removeItem('mt_api_permissions');
    setToken(null);
    setUserRole('guest');
    setMenuPermissions(getDefaultPermissionsForRole('guest'));
    setIsAdmin(false);
    setUsername('');
    setPassword('');
    setActiveSection('users');
    setShowRegisterForm(false);
    showAlert('ออกจากระบบเรียบร้อย');
  };

  // Show registration form
  if (!isAdmin && showRegisterForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="h-14 w-14 rounded-2xl bg-white/10 object-contain p-1" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-3xl">🌐</div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{branding.appName}</h1>
              <p className="text-gray-400">{branding.appSubtitle}</p>
            </div>
          </div>

          {alert && (
            <div className="mb-6 rounded-lg border border-blue-400 bg-blue-900 px-4 py-3 text-blue-100">
              {alert}
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowRegisterForm(false)}
              className="mb-4 text-blue-400 hover:text-blue-300 text-sm transition"
            >
              ← กลับไปที่ Login
            </button>
            <UserManagement
              token={null}
              isAdmin={false}
              onLogout={handleLogout}
              showAlert={showAlert}
            />
          </div>
        </div>
      </div>
    );
  }

  // Login page layout
  if (!isAdmin) {
    console.log('[RENDER] Login page rendering with state:', { username, password });
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="h-14 w-14 rounded-2xl bg-white/10 object-contain p-1" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-3xl">🌐</div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{branding.appName}</h1>
              <p className="text-gray-400">{branding.appSubtitle}</p>
            </div>
          </div>

          {alert && (
            <div className="mb-6 rounded-lg border border-blue-400 bg-blue-900 px-4 py-3 text-blue-100">
              {alert}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Login Form */}
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6">👤 Admin Login</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const val = e.target.value;
                      console.log('[INPUT-USERNAME] Raw value:', val);
                      console.log('[INPUT-USERNAME] Length:', val.length);
                      setUsername(val);
                      console.log('[INPUT-USERNAME] State updated to:', val);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none text-black"
                    placeholder="admin"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      const val = e.target.value;
                      console.log('[INPUT-PASSWORD] Raw value length:', val.length);
                      setPassword(val);
                      console.log('[INPUT-PASSWORD] State updated, length:', val.length);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none text-black"
                    placeholder="••••••"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={(e) => {
                    console.log('[BUTTON-CLICK] Submit button clicked');
                    console.log('[BUTTON-CLICK] Current state at click:', { username, password });
                  }}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 transition"
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>
            </div>

            {/* Registration Panel */}
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6">📝 ลงทะเบียนใหม่</h2>
              <p className="text-gray-600 text-sm mb-4">
                หรือคลิกที่นี่เพื่อลงทะเบียนเป็นผู้ใช้ใหม่
              </p>
              <button
                onClick={() => setShowRegisterForm(true)}
                className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold py-2 transition"
              >
                ไปสู่ฟอร์มลงทะเบียน
              </button>
              <p className="text-xs text-gray-500 mt-4">
                ✓ ให้เข้า Dashboard หลังลงทะเบียน<br/>
                ✓ รอการอนุมัติจากผู้ดูแล<br/>
                ✓ ได้รับ Hot Spot Access
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard with sidebar
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        userRole={userRole}
        permissions={menuPermissions}
        branding={branding}
      />

      {/* Main Content */}
      <main className="flex-1 ml-20 overflow-auto">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 shadow-2xl lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="h-14 w-14 rounded-2xl bg-white/10 object-contain p-1" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-3xl">🌐</div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{branding.appSubtitle}</p>
                <h1 className="mt-2 text-4xl font-bold text-white">{branding.dashboardTitle || `${branding.appName} Dashboard`}</h1>
                <p className="mt-2 text-slate-300">{branding.dashboardSubtitle || branding.appSubtitle}</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-400/30">
                {formatRoleLabel(userRole)}
              </span>
              {alert && (
                <div className="max-w-xs rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-emerald-100 backdrop-blur">
                  {alert}
                </div>
              )}
            </div>
          </div>

          {/* Section Content */}
          <div className="animate-fadeIn">
            {activeSection === 'users' && (
              <UserManagement
                token={token}
                isAdmin={isAdmin}
                userRole={userRole}
                permissions={menuPermissions}
                onLogout={handleLogout}
                showAlert={showAlert}
              />
            )}
            
            {activeSection === 'system' && (
              <SystemStatus token={token} />
            )}

            {activeSection === 'settings' && (
              <Settings token={token} showAlert={showAlert} userRole={userRole} permissions={menuPermissions} onBrandingChange={setBranding} />
            )}

            {activeSection === 'access-control' && (
              <AccessControlManager token={token} showAlert={showAlert} userRole={userRole} permissions={menuPermissions} />
            )}

            {activeSection === 'reports' && (
              <ReportsCenter token={token} showAlert={showAlert} userRole={userRole} permissions={menuPermissions} />
            )}

            {(activeSection === 'mikrotik' || activeSection === 'ip-binding' || activeSection === 'walled-garden') && (
              <MikroTikDashboard
                token={token}
                showAlert={showAlert}
                initialTab={
                  activeSection === 'ip-binding'
                    ? 'ip-binding'
                    : activeSection === 'walled-garden'
                      ? 'walled-garden'
                      : 'system'
                }
              />
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-300">
              {branding.footerText || DEFAULT_APP_BRANDING.footerText}
            </div>
            <div className="text-xs">
              <VersionInfo />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
