import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000/api`;

const EMPTY_USER_FORM = {
  id: null,
  username: '',
  password: '',
  role: 'viewer',
  enabled: true,
  note: '',
};

const RESERVED_ROLES = ['super_admin', 'admin', 'viewer'];

const normalizeRoleKey = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

export default function AccessControlManager({ token, showAlert, userRole = 'super_admin' }) {
  const [loading, setLoading] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [menuDefinitions, setMenuDefinitions] = useState([]);
  const [actionDefinitions, setActionDefinitions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [roleForm, setRoleForm] = useState({ key: '', label: '' });
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);

  const managedUsers = useMemo(() => users.filter((user) => !user.readOnly), [users]);

  useEffect(() => {
    fetchOverview();
    fetchLoginHistory();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/access-control`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load access control data');
      }

      setMenuDefinitions(data.menuDefinitions || []);
      setActionDefinitions(data.actionDefinitions || []);
      setRoles(data.roles || []);
      setUsers(data.users || []);
    } catch (error) {
      console.error('[AccessControl] Fetch error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch(`${API_BASE}/auth/login-history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load login history');
      }

      setLoginHistory(data.items || []);
    } catch (error) {
      console.error('[AccessControl] Login history error:', error);
      setLoginHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetUserForm = () => {
    setUserForm(EMPTY_USER_FORM);
  };

  const handleAddRole = () => {
    const key = normalizeRoleKey(roleForm.key || roleForm.label);
    const label = String(roleForm.label || '').trim();

    if (!key || !label) {
      showAlert('กรุณากรอก Role Key และชื่อ Role');
      return;
    }

    if (roles.some((role) => role.key === key)) {
      showAlert('Role นี้มีอยู่แล้ว');
      return;
    }

    const permissions = (menuDefinitions || []).reduce((acc, item) => {
      acc[item.key] = false;
      return acc;
    }, {});

    permissions.actions = (actionDefinitions || []).reduce((acc, section) => {
      acc[section.sectionKey] = (section.actions || []).reduce((actionAcc, action) => {
        actionAcc[action.key] = false;
        return actionAcc;
      }, {});
      return acc;
    }, {});

    setRoles((prev) => ([
      ...prev,
      {
        key,
        label,
        systemRole: false,
        permissions,
      },
    ]));

    setRoleForm({ key: '', label: '' });
    showAlert('➕ เพิ่ม role ใหม่แล้ว กด Save Role Permissions เพื่อบันทึก');
  };

  const handleDeleteRole = (roleKey) => {
    if (RESERVED_ROLES.includes(roleKey)) {
      showAlert('ไม่สามารถลบ role พื้นฐานของระบบได้');
      return;
    }

    if (managedUsers.some((user) => user.role === roleKey)) {
      showAlert('ยังมีผู้ใช้ที่ใช้ role นี้อยู่ กรุณาเปลี่ยน role ของผู้ใช้ก่อน');
      return;
    }

    setRoles((prev) => prev.filter((role) => role.key !== roleKey));
    showAlert('🗑️ ลบ role ออกจากรายการแล้ว กด Save Role Permissions เพื่อยืนยัน');
  };

  const togglePermission = (roleKey, menuKey) => {
    setRoles((prev) => prev.map((role) => {
      if (role.key !== roleKey) return role;
      if (role.key === 'super_admin') return role;

      const nextEnabled = !role.permissions?.[menuKey];
      const nextActions = { ...(role.permissions?.actions || {}) };

      if (!nextEnabled && nextActions?.[menuKey]) {
        nextActions[menuKey] = Object.keys(nextActions[menuKey]).reduce((acc, actionKey) => {
          acc[actionKey] = false;
          return acc;
        }, {});
      }

      if (nextEnabled && nextActions?.[menuKey] && Object.prototype.hasOwnProperty.call(nextActions[menuKey], 'view')) {
        nextActions[menuKey] = {
          ...nextActions[menuKey],
          view: true,
        };
      }

      return {
        ...role,
        permissions: {
          ...role.permissions,
          [menuKey]: nextEnabled,
          actions: nextActions,
        },
      };
    }));
  };

  const toggleActionPermission = (roleKey, sectionKey, actionKey) => {
    setRoles((prev) => prev.map((role) => {
      if (role.key !== roleKey) return role;
      if (role.key === 'super_admin') return role;

      const currentValue = !!role.permissions?.actions?.[sectionKey]?.[actionKey];
      const nextSectionActions = {
        ...(role.permissions?.actions?.[sectionKey] || {}),
        [actionKey]: !currentValue,
      };

      return {
        ...role,
        permissions: {
          ...role.permissions,
          [sectionKey]: !currentValue ? true : role.permissions?.[sectionKey],
          actions: {
            ...(role.permissions?.actions || {}),
            [sectionKey]: nextSectionActions,
          },
        },
      };
    }));
  };

  const handleSaveRoles = async () => {
    try {
      setSavingRoles(true);
      const response = await fetch(`${API_BASE}/settings/access-control/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roles }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save role permissions');
      }

      setRoles(data.roles || []);
      setMenuDefinitions(data.menuDefinitions || menuDefinitions);
      setUsers(data.users || users);
      showAlert('✅ บันทึก Role Permissions เรียบร้อยแล้ว');
    } catch (error) {
      console.error('[AccessControl] Save roles error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setSavingRoles(false);
    }
  };

  const handleEditUser = (user) => {
    if (user.readOnly) {
      showAlert('บัญชีจากไฟล์ .env แก้ไขที่หน้าเซิร์ฟเวอร์โดยตรง');
      return;
    }

    setUserForm({
      id: user.id,
      username: user.username || '',
      password: '',
      role: user.role || 'viewer',
      enabled: user.enabled !== false,
      note: user.note || '',
    });
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();

    if (!userForm.username.trim()) {
      showAlert('กรุณากรอก Username');
      return;
    }

    if (!userForm.id && !userForm.password.trim()) {
      showAlert('กรุณากรอก Password สำหรับผู้ใช้ใหม่');
      return;
    }

    try {
      setSavingUser(true);
      const url = userForm.id
        ? `${API_BASE}/settings/access-control/users/${encodeURIComponent(userForm.id)}`
        : `${API_BASE}/settings/access-control/users`;

      const response = await fetch(url, {
        method: userForm.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save dashboard user');
      }

      setUsers(data.users || []);
      resetUserForm();
      showAlert(userForm.id ? '✅ อัปเดตผู้ใช้เรียบร้อยแล้ว' : '✅ เพิ่มผู้ใช้เรียบร้อยแล้ว');
    } catch (error) {
      console.error('[AccessControl] Save user error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.readOnly) {
      showAlert('บัญชีจากไฟล์ .env ลบจากหน้านี้ไม่ได้');
      return;
    }

    if (!window.confirm(`ต้องการลบบัญชี ${user.username} หรือไม่?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/settings/access-control/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete dashboard user');
      }

      setUsers(data.users || []);
      if (userForm.id === user.id) {
        resetUserForm();
      }
      showAlert('✅ ลบผู้ใช้เรียบร้อยแล้ว');
    } catch (error) {
      console.error('[AccessControl] Delete user error:', error);
      showAlert(`❌ ${error.message}`);
    }
  };

  if (userRole !== 'super_admin') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow">
        <h2 className="text-2xl font-bold">🔒 Role & Permission Management</h2>
        <p className="mt-2 text-sm">เมนูนี้เปิดให้เฉพาะ `Super Admin` เท่านั้น</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">🛡️ Role & Permission Management</h2>
            <p className="mt-1 text-sm text-gray-500">กำหนดว่า role ไหนเห็นเมนูอะไรบ้าง และจัดการบัญชีผู้ใช้งาน dashboard</p>
          </div>
          <button
            onClick={() => {
              fetchOverview();
              fetchLoginHistory();
            }}
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:bg-gray-400"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm text-sky-700">จำนวน Roles</p>
            <p className="mt-2 text-3xl font-bold text-sky-950">{roles.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">บัญชีทั้งหมด</p>
            <p className="mt-2 text-3xl font-bold text-emerald-950">{users.length}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm text-violet-700">Managed Users</p>
            <p className="mt-2 text-3xl font-bold text-violet-950">{managedUsers.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-black">🎛️ Menu Permissions by Role</h3>
            <p className="mt-1 text-sm text-gray-500">ติ๊กเพื่อกำหนดว่าแต่ละ role จะเห็นเมนูไหนบน sidebar</p>
          </div>
          <button
            onClick={handleSaveRoles}
            disabled={savingRoles}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {savingRoles ? 'กำลังบันทึก...' : '💾 Save Role Permissions'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 md:grid-cols-[1fr,1fr,auto]">
          <input
            type="text"
            value={roleForm.key}
            onChange={(event) => setRoleForm((prev) => ({ ...prev, key: event.target.value }))}
            placeholder="role key เช่น report_admin"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            value={roleForm.label}
            onChange={(event) => setRoleForm((prev) => ({ ...prev, label: event.target.value }))}
            placeholder="ชื่อที่แสดง เช่น Report Admin"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddRole}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            ➕ Add Role
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Role</th>
                {menuDefinitions.map((menu) => (
                  <th key={menu.key} className="px-3 py-3 text-center font-semibold whitespace-nowrap">{menu.label}</th>
                ))}
                <th className="px-3 py-3 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.key} className="hover:bg-gray-50">
                  <td className="px-3 py-3 align-top">
                    <div className="font-semibold text-black">{role.label}</div>
                    <div className="text-xs text-gray-500">{role.key}</div>
                  </td>
                  {menuDefinitions.map((menu) => (
                    <td key={`${role.key}-${menu.key}`} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!role.permissions?.[menu.key]}
                        disabled={role.key === 'super_admin'}
                        onChange={() => togglePermission(role.key, menu.key)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    {RESERVED_ROLES.includes(role.key) ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500">system</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role.key)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                      >
                        ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-black">🎯 Action-level Permissions</h3>
            <p className="mt-1 text-sm text-gray-500">กำหนดสิทธิ์ย่อยระดับการกระทำ เช่น approve, import, export, backup, test และ view login history</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Section / Action</th>
                {roles.map((role) => (
                  <th key={`head-${role.key}`} className="px-3 py-3 text-center font-semibold whitespace-nowrap">{role.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {actionDefinitions.map((section) => (
                <>
                  <tr key={`${section.sectionKey}-title`} className="bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-900" colSpan={roles.length + 1}>{section.sectionLabel}</td>
                  </tr>
                  {(section.actions || []).map((action) => (
                    <tr key={`${section.sectionKey}-${action.key}`} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-slate-700">↳ {action.label}</td>
                      {roles.map((role) => (
                        <td key={`${role.key}-${section.sectionKey}-${action.key}`} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!role.permissions?.actions?.[section.sectionKey]?.[action.key]}
                            disabled={role.key === 'super_admin'}
                            onChange={() => toggleActionPermission(role.key, section.sectionKey, action.key)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1.4fr]">
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-black">👤 Dashboard User Management</h3>
            <p className="mt-1 text-sm text-gray-500">เพิ่มผู้ใช้สำหรับเข้าหน้า Admin Dashboard และกำหนด role ได้ทันที</p>
          </div>

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={userForm.username}
                onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                placeholder="เช่น report01"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password {userForm.id ? '(เว้นว่างได้ถ้าไม่เปลี่ยน)' : ''}</label>
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <select
                value={userForm.role}
                onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
              >
                {roles.map((role) => (
                  <option key={role.key} value={role.key}>{role.label} ({role.key})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
              <textarea
                value={userForm.note}
                onChange={(event) => setUserForm((prev) => ({ ...prev, note: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="คำอธิบายเพิ่มเติม"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!userForm.enabled}
                onChange={(event) => setUserForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              />
              เปิดใช้งานบัญชีนี้
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={savingUser}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
              >
                {savingUser ? 'กำลังบันทึก...' : userForm.id ? '💾 Update User' : '➕ Add User'}
              </button>
              <button
                type="button"
                onClick={resetUserForm}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-300"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-black">📋 Dashboard Accounts</h3>
              <p className="mt-1 text-sm text-gray-500">บัญชีจาก `.env` จะแสดงแบบ read-only ส่วนบัญชีที่สร้างจากหน้านี้สามารถแก้ไขได้</p>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-500">กำลังโหลด...</div>
            ) : (
              <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold text-black">{user.username}</h4>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                          {user.enabled ? 'Active' : 'Disabled'}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.readOnly ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
                          {user.readOnly ? 'ENV' : 'Managed'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">Role: <span className="font-semibold">{user.label || user.role}</span> ({user.role})</p>
                      <p className="mt-1 text-sm text-gray-500">{user.note || '-'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!user.readOnly && (
                        <button
                          type="button"
                          onClick={() => handleEditUser(user)}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {!user.readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  ยังไม่มีบัญชีเพิ่มเติมในระบบ
                </div>
              )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-black">🕘 Login History</h3>
                <p className="mt-1 text-sm text-gray-500">เก็บประวัติการเข้าสู่ระบบทั้งสำเร็จและไม่สำเร็จ เพื่อช่วยตรวจสอบย้อนหลัง</p>
              </div>
              <button
                type="button"
                onClick={fetchLoginHistory}
                className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                Refresh History
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-slate-700">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left">เวลา</th>
                    <th className="px-3 py-2 text-left">Username</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">IP / Message</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-4 text-center text-gray-500">กำลังโหลด...</td>
                    </tr>
                  ) : loginHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-4 text-center text-gray-500">ยังไม่มีประวัติการเข้าสู่ระบบ</td>
                    </tr>
                  ) : (
                    loginHistory.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'}</td>
                        <td className="px-3 py-2 font-semibold">{item.username}</td>
                        <td className="px-3 py-2">{item.role}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{item.ipAddress || '-'} • {item.message || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
