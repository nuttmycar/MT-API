import { useState, useEffect } from 'react';

export default function Sidebar({ activeSection, setActiveSection, isAdmin, onLogout, userRole = 'super_admin', permissions = {}, branding = {} }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fallbackPermissions = userRole === 'super_admin'
    ? { users: true, system: true, reports: true, mikrotik: true, 'ip-binding': true, 'walled-garden': true, settings: true, 'access-control': true }
    : userRole === 'admin'
      ? { users: true, system: true, reports: true, mikrotik: true, 'ip-binding': true, 'walled-garden': true, settings: true, 'access-control': false }
      : { users: true, system: true, reports: true, mikrotik: false, 'ip-binding': false, 'walled-garden': false, settings: false, 'access-control': false };
  const resolvedPermissions = Object.keys(permissions || {}).length > 0 ? permissions : fallbackPermissions;
  const hasAdvancedAccess = resolvedPermissions.settings || resolvedPermissions.mikrotik || resolvedPermissions['ip-binding'] || resolvedPermissions['walled-garden'] || resolvedPermissions['access-control'];
  const appName = branding?.appName || 'MT-API';
  const logoUrl = branding?.logoUrl || '';

  return (
    <div className={`fixed left-0 top-0 h-screen border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white transition-all duration-300 ${
      sidebarOpen ? 'w-64' : 'w-20'
    } shadow-2xl z-40`}>
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
        <div className="flex items-center gap-3 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-9 w-9 rounded-xl bg-white/10 object-contain p-1" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-lg">🌐</div>
          )}
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-wide">{appName}</h1>
              <p className="text-xs text-slate-400">{hasAdvancedAccess ? 'Admin Console' : 'Viewer Console'}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-800 rounded transition"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-8">
        {isAdmin && (
          <>
            {resolvedPermissions.users && (
              <button
                onClick={() => setActiveSection('users')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'users'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">👥</span>
                {sidebarOpen && <span>ผู้ใช้</span>}
              </button>
            )}

            {resolvedPermissions.system && (
              <button
                onClick={() => setActiveSection('system')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'system'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">📊</span>
                {sidebarOpen && <span>สถานะระบบ</span>}
              </button>
            )}

            {resolvedPermissions.reports && (
              <button
                onClick={() => setActiveSection('reports')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'reports'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">🗂️</span>
                {sidebarOpen && <span>รายงาน</span>}
              </button>
            )}

            {resolvedPermissions.mikrotik && (
              <button
                onClick={() => setActiveSection('mikrotik')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'mikrotik'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">🐧</span>
                {sidebarOpen && <span>MikroTik</span>}
              </button>
            )}

            {resolvedPermissions['ip-binding'] && (
              <button
                onClick={() => setActiveSection('ip-binding')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'ip-binding'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">🧷</span>
                {sidebarOpen && <span>IP Binding</span>}
              </button>
            )}

            {resolvedPermissions['walled-garden'] && (
              <button
                onClick={() => setActiveSection('walled-garden')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'walled-garden'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">🌍</span>
                {sidebarOpen && <span>Walled Garden</span>}
              </button>
            )}

            {resolvedPermissions.settings && (
              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'settings'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">⚙️</span>
                {sidebarOpen && <span>Settings</span>}
              </button>
            )}

            {resolvedPermissions['access-control'] && (
              <button
                onClick={() => setActiveSection('access-control')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  activeSection === 'access-control'
                    ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">🛡️</span>
                {sidebarOpen && <span>Role & Permission</span>}
              </button>
            )}
          </>
        )}

        {/* Registration - Always visible */}
        {!isAdmin && (
          <button
            onClick={() => setActiveSection('register')}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
              activeSection === 'register'
                ? 'border-l-4 border-cyan-200 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg'
                : 'hover:bg-white/5'
            }`}
          >
            <span className="text-xl">📝</span>
            {sidebarOpen && <span>ลงทะเบียน</span>}
          </button>
        )}
      </nav>

      {/* Footer - Logout */}
      {isAdmin && (
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 py-2 text-white transition hover:from-rose-500 hover:to-red-600"
          >
            <span>🚪</span>
            {sidebarOpen && <span>ออกจากระบบ</span>}
          </button>
        </div>
      )}
    </div>
  );
}
