import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function MikroTikDashboard({ token, showAlert, initialTab = 'system' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [interfaces, setInterfaces] = useState(null);
  const [hotspotUsers, setHotspotUsers] = useState(null);
  const [hotspotServers, setHotspotServers] = useState([{ id: 'all', name: 'all' }]);
  const [ipBindings, setIpBindings] = useState([]);
  const [walledGardens, setWalledGardens] = useState([]);
  const [dhcpLeases, setDhcpLeases] = useState([]);
  const [bandwidth, setBandwidth] = useState(null);
  const [selectedInterface, setSelectedInterface] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null); // null = disabled, 5000 = 5s, etc
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [mikrotikMeta, setMikrotikMeta] = useState({
    endpointLabel: 'ยังไม่ได้โหลด',
    transport: 'UNKNOWN',
    dataSource: '',
    diagnostics: null,
  });
  const [editingBindingId, setEditingBindingId] = useState(null);
  const [bindingForm, setBindingForm] = useState({
    address: '',
    macAddress: '',
    toAddress: '',
    type: 'regular',
    server: 'all',
    comment: '',
    disabled: false,
  });
  const [bindingFilters, setBindingFilters] = useState({
    search: '',
    server: 'all',
    type: 'all',
    status: 'all',
  });
  const [editingWalledGardenId, setEditingWalledGardenId] = useState(null);
  const [walledGardenForm, setWalledGardenForm] = useState({
    dstHost: '',
    path: '',
    dstPort: '',
    protocol: 'any',
    server: 'all',
    action: 'allow',
    comment: '',
    disabled: false,
  });
  const [walledGardenFilters, setWalledGardenFilters] = useState({
    search: '',
    server: 'all',
    action: 'all',
    status: 'all',
  });
  const [leaseFilters, setLeaseFilters] = useState({
    search: '',
    server: 'all',
    type: 'all',
    status: 'all',
  });

  useEffect(() => {
    if (activeTab === 'system') fetchSystemStatus();
    if (activeTab === 'interfaces') fetchInterfaces();
    if (activeTab === 'hotspot') fetchHotspotUsers();
    if (activeTab === 'dhcp-leases') fetchDhcpLeases();
    if (activeTab === 'ip-binding') {
      fetchIpBindings();
      fetchHotspotServers();
    }
    if (activeTab === 'walled-garden') {
      fetchWalledGardens();
      fetchHotspotServers();
    }
    if (activeTab === 'bandwidth') fetchBandwidth();
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(initialTab || 'system');
  }, [initialTab]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshInterval) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        setRefreshTimer(null);
      }
      return;
    }

    const timer = setInterval(() => {
      if (activeTab === 'system') fetchSystemStatus();
      if (activeTab === 'interfaces') fetchInterfaces();
      if (activeTab === 'hotspot') fetchHotspotUsers();
      if (activeTab === 'dhcp-leases') fetchDhcpLeases();
      if (activeTab === 'ip-binding') {
        fetchIpBindings();
        fetchHotspotServers();
      }
      if (activeTab === 'walled-garden') {
        fetchWalledGardens();
        fetchHotspotServers();
      }
      if (activeTab === 'bandwidth') fetchBandwidth();
    }, autoRefreshInterval);

    setRefreshTimer(timer);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoRefreshInterval, activeTab]);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/mikrotik/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSystemStatus(data.status);
        setLastUpdate(new Date().toLocaleTimeString('th-TH'));
        updateMikrotikMeta('System Status', data, data.status?.dataSource || '');
      } else {
        showAlert('❌ ' + (data.message || 'Failed to fetch system status'));
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Connection error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterfaces = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/mikrotik/interfaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setInterfaces(data.interfaces);
        setLastUpdate(new Date().toLocaleTimeString('th-TH'));
        updateMikrotikMeta('Interfaces', data, data.interfaces?.[0]?.dataSource || '');
      } else {
        showAlert('❌ ' + (data.message || 'Failed to fetch interfaces'));
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Connection error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotspotUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/mikrotik/hotspot-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHotspotUsers(data.users);
        setLastUpdate(new Date().toLocaleTimeString('th-TH'));
        updateMikrotikMeta('Hotspot Users', data, data.users?.[0]?.dataSource || '');
      } else {
        showAlert('❌ ' + (data.message || 'Failed to fetch hotspot users'));
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Connection error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetBindingForm = () => {
    setEditingBindingId(null);
    setBindingForm({
      address: '',
      macAddress: '',
      toAddress: '',
      type: 'regular',
      server: 'all',
      comment: '',
      disabled: false,
    });
  };

  const resetWalledGardenForm = () => {
    setEditingWalledGardenId(null);
    setWalledGardenForm({
      dstHost: '',
      path: '',
      dstPort: '',
      protocol: 'any',
      server: 'all',
      action: 'allow',
      comment: '',
      disabled: false,
    });
  };

  const fetchHotspotServers = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/mikrotik/hotspot-servers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHotspotServers(Array.isArray(data.servers) && data.servers.length > 0 ? data.servers : [{ id: 'all', name: 'all' }]);
      } else {
        setHotspotServers([{ id: 'all', name: 'all' }]);
        showAlert('⚠️ ไม่สามารถดึงรายชื่อ Hotspot Server จาก MikroTik ได้');
      }
    } catch (error) {
      console.error('Hotspot server fetch error:', error);
      setHotspotServers([{ id: 'all', name: 'all' }]);
    }
  };

  const fetchIpBindings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/mikrotik/ip-bindings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIpBindings(data.bindings || []);
        setLastUpdate(new Date().toLocaleTimeString('th-TH'));
        updateMikrotikMeta('IP Binding', data, data.bindings?.[0]?.dataSource || '');
      } else {
        showAlert('❌ ' + (data.message || 'Failed to fetch IP bindings'));
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Connection error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalledGardens = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/mikrotik/walled-garden`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setWalledGardens(data.rules || []);
        setLastUpdate(new Date().toLocaleTimeString('th-TH'));
        updateMikrotikMeta('Walled Garden', data, data.rules?.[0]?.dataSource || '');
      } else {
        showAlert('❌ ' + (data.message || 'Failed to fetch Walled Garden rules'));
      }
    } catch (error) {
      console.error('Walled Garden fetch error:', error);
      showAlert('Connection error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDhcpLeases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/mikrotik/dhcp-leases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDhcpLeases(data.leases || []);
        setLastUpdate(new Date().toLocaleTimeString('th-TH'));
        updateMikrotikMeta('DHCP Leases', data, data.leases?.[0]?.dataSource || '');
      } else {
        showAlert('❌ ' + (data.message || 'Failed to fetch DHCP leases'));
      }
    } catch (error) {
      console.error('DHCP lease fetch error:', error);
      showAlert('Connection error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditIpBinding = (binding) => {
    setEditingBindingId(binding.id);
    setBindingForm({
      address: binding.address || '',
      macAddress: binding.macAddress || '',
      toAddress: binding.toAddress || '',
      type: binding.type || 'regular',
      server: binding.server || 'all',
      comment: binding.comment || '',
      disabled: !!binding.disabled,
    });
  };

  const handleSaveIpBinding = async (event) => {
    event.preventDefault();

    if (!bindingForm.address.trim() && !bindingForm.macAddress.trim()) {
      showAlert('กรุณากรอก IP Address หรือ MAC Address อย่างน้อย 1 ค่า');
      return;
    }

    try {
      setLoading(true);
      const url = editingBindingId
        ? `${API_BASE}/settings/mikrotik/ip-bindings/${encodeURIComponent(editingBindingId)}`
        : `${API_BASE}/settings/mikrotik/ip-bindings`;

      const response = await fetch(url, {
        method: editingBindingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bindingForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save IP Binding');
      }

      showAlert(editingBindingId ? '✅ แก้ไข IP Binding เรียบร้อยแล้ว' : '✅ เพิ่ม IP Binding เรียบร้อยแล้ว');
      resetBindingForm();
      await fetchIpBindings();
    } catch (error) {
      console.error('IP Binding save error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIpBindingAction = async (binding, action) => {
    const actionLabel = action === 'delete'
      ? 'ลบ'
      : action === 'disable'
        ? 'ปิดการใช้งาน'
        : 'เปิดการใช้งาน';

    if (!window.confirm(`ต้องการ${actionLabel} IP Binding ${binding.address || binding.macAddress || binding.id} หรือไม่?`)) {
      return;
    }

    try {
      setLoading(true);
      const url = action === 'delete'
        ? `${API_BASE}/settings/mikrotik/ip-bindings/${encodeURIComponent(binding.id)}`
        : `${API_BASE}/settings/mikrotik/ip-bindings/${encodeURIComponent(binding.id)}/${action}`;

      const response = await fetch(url, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} IP Binding`);
      }

      showAlert(`✅ ${actionLabel} IP Binding เรียบร้อยแล้ว`);
      await fetchIpBindings();
    } catch (error) {
      console.error('IP Binding action error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditWalledGarden = (rule) => {
    setEditingWalledGardenId(rule.id);
    setWalledGardenForm({
      dstHost: rule.dstHost || '',
      path: rule.path || '',
      dstPort: rule.dstPort || '',
      protocol: rule.protocol || 'any',
      server: rule.server || 'all',
      action: rule.action || 'allow',
      comment: rule.comment || '',
      disabled: !!rule.disabled,
    });
  };

  const handleSaveWalledGarden = async (event) => {
    event.preventDefault();

    if (!walledGardenForm.dstHost.trim() && !walledGardenForm.path.trim() && !walledGardenForm.dstPort.trim()) {
      showAlert('กรุณากรอก dst-host, path หรือ dst-port อย่างน้อย 1 ค่า');
      return;
    }

    try {
      setLoading(true);
      const url = editingWalledGardenId
        ? `${API_BASE}/settings/mikrotik/walled-garden/${encodeURIComponent(editingWalledGardenId)}`
        : `${API_BASE}/settings/mikrotik/walled-garden`;

      const response = await fetch(url, {
        method: editingWalledGardenId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(walledGardenForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save Walled Garden rule');
      }

      showAlert(editingWalledGardenId ? '✅ แก้ไข Walled Garden เรียบร้อยแล้ว' : '✅ เพิ่ม Walled Garden เรียบร้อยแล้ว');
      resetWalledGardenForm();
      await fetchWalledGardens();
    } catch (error) {
      console.error('Walled Garden save error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWalledGardenAction = async (rule, action) => {
    const actionLabel = action === 'delete'
      ? 'ลบ'
      : action === 'disable'
        ? 'ปิดการใช้งาน'
        : 'เปิดการใช้งาน';

    if (!window.confirm(`ต้องการ${actionLabel} Walled Garden ${rule.dstHost || rule.path || rule.id} หรือไม่?`)) {
      return;
    }

    try {
      setLoading(true);
      const url = action === 'delete'
        ? `${API_BASE}/settings/mikrotik/walled-garden/${encodeURIComponent(rule.id)}`
        : `${API_BASE}/settings/mikrotik/walled-garden/${encodeURIComponent(rule.id)}/${action}`;

      const response = await fetch(url, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} Walled Garden rule`);
      }

      showAlert(`✅ ${actionLabel} Walled Garden เรียบร้อยแล้ว`);
      await fetchWalledGardens();
    } catch (error) {
      console.error('Walled Garden action error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBandwidth = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/mikrotik/bandwidth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setBandwidth(data.bandwidth);
        setLastUpdate(new Date().toLocaleTimeString('th-TH'));
        updateMikrotikMeta('Bandwidth', data, data.bandwidth?.[0]?.dataSource || '');
      } else {
        showAlert('❌ ' + (data.message || 'Failed to fetch bandwidth'));
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Connection error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHotspotUserAction = async (username, action) => {
    const actionLabel = action === 'delete'
      ? 'ลบ'
      : action === 'disable'
        ? 'ปิดการใช้งาน'
        : 'เปิดการใช้งาน';

    if (!window.confirm(`ต้องการ${actionLabel} user ${username} หรือไม่?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        action === 'delete'
          ? `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(username)}`
          : `${API_BASE}/settings/mikrotik/hotspot-users/${encodeURIComponent(username)}/${action}`,
        {
          method: action === 'delete' ? 'DELETE' : 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} user`);
      }

      showAlert(`✅ ${actionLabel} ${username} เรียบร้อยแล้ว`);
      await fetchHotspotUsers();
    } catch (error) {
      console.error('Hotspot action error:', error);
      showAlert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (running) => {
    return running ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getUsageBarColor = (percent) => {
    if (percent === null || percent === undefined) return 'bg-gray-300';
    if (percent >= 80) return 'bg-red-500';
    if (percent >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const updateMikrotikMeta = (endpointLabel, data, fallbackDataSource = '') => {
    setMikrotikMeta({
      endpointLabel,
      transport: data?.transport || data?.status?.transport || data?.diagnostics?.activeTransport || 'UNKNOWN',
      dataSource: data?.dataSource || data?.status?.dataSource || fallbackDataSource || '',
      diagnostics: data?.diagnostics || null,
    });
  };

  const getTransportBadgeColor = (transport = '') => {
    if (transport.includes('ROS-API')) return 'bg-violet-100 text-violet-800 border-violet-200';
    if (transport.includes('REST')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (transport.includes('MOCK')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const summary = systemStatus?.summary || {};
  const cpuLoad = typeof systemStatus?.cpuLoad === 'number' ? systemStatus.cpuLoad : null;
  const memoryUsage = typeof systemStatus?.memoryUsagePercent === 'number' ? systemStatus.memoryUsagePercent : null;
  const diskUsage = typeof systemStatus?.diskUsagePercent === 'number' ? systemStatus.diskUsagePercent : null;
  const bindingServerOptions = Array.isArray(hotspotServers) && hotspotServers.length > 0
    ? hotspotServers
    : [{ id: 'all', name: 'all' }];
  const bindingSearch = bindingFilters.search.trim().toLowerCase();
  const filteredIpBindings = ipBindings.filter((binding) => {
    const matchesSearch = !bindingSearch || [binding.address, binding.macAddress, binding.comment, binding.server, binding.type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(bindingSearch));
    const matchesServer = bindingFilters.server === 'all' || (binding.server || 'all') === bindingFilters.server;
    const matchesType = bindingFilters.type === 'all' || (binding.type || 'regular') === bindingFilters.type;
    const matchesStatus = bindingFilters.status === 'all'
      || (bindingFilters.status === 'active' ? !binding.disabled : !!binding.disabled);

    return matchesSearch && matchesServer && matchesType && matchesStatus;
  });
  const bindingSummary = {
    total: ipBindings.length,
    active: ipBindings.filter((binding) => !binding.disabled).length,
    disabled: ipBindings.filter((binding) => !!binding.disabled).length,
    bypassed: ipBindings.filter((binding) => binding.type === 'bypassed').length,
  };
  const leaseSearch = leaseFilters.search.trim().toLowerCase();
  const leaseServerOptions = [
    { id: 'all', name: 'all' },
    ...Array.from(new Set(dhcpLeases.map((lease) => lease.server || '-').filter(Boolean)))
      .filter((server) => server !== 'all')
      .sort((a, b) => a.localeCompare(b))
      .map((server) => ({ id: server, name: server })),
  ];
  const filteredDhcpLeases = dhcpLeases.filter((lease) => {
    const normalizedStatus = String(lease.status || '').toLowerCase();
    const leaseType = lease.dynamic ? 'dynamic' : 'static';
    const matchesSearch = !leaseSearch || [lease.address, lease.activeAddress, lease.macAddress, lease.hostName, lease.server, lease.comment, normalizedStatus]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(leaseSearch));
    const matchesServer = leaseFilters.server === 'all' || (lease.server || '-') === leaseFilters.server;
    const matchesType = leaseFilters.type === 'all' || leaseType === leaseFilters.type;
    const matchesStatus = leaseFilters.status === 'all'
      || normalizedStatus === leaseFilters.status
      || (leaseFilters.status === 'active' && ['bound', 'offered'].includes(normalizedStatus));

    return matchesSearch && matchesServer && matchesType && matchesStatus;
  });
  const leaseSummary = {
    total: dhcpLeases.length,
    active: dhcpLeases.filter((lease) => ['bound', 'offered'].includes(String(lease.status || '').toLowerCase())).length,
    waiting: dhcpLeases.filter((lease) => String(lease.status || '').toLowerCase() === 'waiting').length,
    dynamic: dhcpLeases.filter((lease) => lease.dynamic).length,
    static: dhcpLeases.filter((lease) => !lease.dynamic).length,
  };
  const walledSearch = walledGardenFilters.search.trim().toLowerCase();
  const filteredWalledGardens = walledGardens.filter((rule) => {
    const matchesSearch = !walledSearch || [rule.dstHost, rule.path, rule.comment, rule.server, rule.protocol, rule.dstPort]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(walledSearch));
    const matchesServer = walledGardenFilters.server === 'all' || (rule.server || 'all') === walledGardenFilters.server;
    const matchesAction = walledGardenFilters.action === 'all' || (rule.action || 'allow') === walledGardenFilters.action;
    const matchesStatus = walledGardenFilters.status === 'all'
      || (walledGardenFilters.status === 'active' ? !rule.disabled : !!rule.disabled);

    return matchesSearch && matchesServer && matchesAction && matchesStatus;
  });
  const walledGardenSummary = {
    total: walledGardens.length,
    active: walledGardens.filter((rule) => !rule.disabled).length,
    disabled: walledGardens.filter((rule) => !!rule.disabled).length,
    allow: walledGardens.filter((rule) => (rule.action || 'allow') === 'allow').length,
    deny: walledGardens.filter((rule) => (rule.action || 'allow') === 'deny').length,
  };
  const diagnostics = mikrotikMeta.diagnostics || {};
  const displayTransport = mikrotikMeta.transport || 'UNKNOWN';
  const displayDataSource = mikrotikMeta.dataSource || systemStatus?.dataSource || 'UNKNOWN';

  return (
    <div className="space-y-6">
      {/* Auto-Refresh Control */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">⟳ Auto Refresh:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setAutoRefreshInterval(null)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  autoRefreshInterval === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ❌ ปิด
              </button>
              <button
                onClick={() => setAutoRefreshInterval(5000)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  autoRefreshInterval === 5000
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                5 วินาที
              </button>
              <button
                onClick={() => setAutoRefreshInterval(10000)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  autoRefreshInterval === 10000
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                10 วินาที
              </button>
              <button
                onClick={() => setAutoRefreshInterval(30000)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  autoRefreshInterval === 30000
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                30 วินาที
              </button>
              <button
                onClick={() => setAutoRefreshInterval(60000)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  autoRefreshInterval === 60000
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                1 นาที
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {lastUpdate && (
              <div className="text-gray-600">
                🕐 อัปเดตล่าสุด: <span className="font-semibold">{lastUpdate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-sky-900">🧭 ROS v6/v7 Diagnostics</h3>
            <p className="mt-1 text-xs text-sky-700">
              Endpoint ล่าสุด: <span className="font-semibold">{mikrotikMeta.endpointLabel}</span>
            </p>
          </div>
          <div className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${getTransportBadgeColor(displayTransport)}`}>
            Transport: {displayTransport}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
          <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-gray-500">OS Version</p>
            <p className="font-semibold text-gray-900">{diagnostics.osVersion || systemStatus?.os_version || '-'}</p>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-gray-500">Preferred</p>
            <p className="font-semibold text-gray-900">{diagnostics.preferredTransport || '-'}</p>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-gray-500">API / REST Port</p>
            <p className="font-semibold text-gray-900">{diagnostics.apiPort || '-'} / {diagnostics.restPort || '-'}</p>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-gray-500">Data Source</p>
            <p className="font-semibold text-gray-900">{displayDataSource}</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-sky-800">
          <span className="font-semibold">หมายเหตุ:</span> ถ้าตั้ง `ROS v6` ควรเห็น `ROS-API` ส่วน `ROS v7` โดยทั่วไปจะเห็น `REST`.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeTab === 'system'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📊 ระบบ
        </button>
        <button
          onClick={() => setActiveTab('interfaces')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeTab === 'interfaces'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🌐 อินเทอร์เฟส
        </button>
        <button
          onClick={() => setActiveTab('hotspot')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeTab === 'hotspot'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          👥 ผู้ใช้ Hotspot
        </button>
        <button
          onClick={() => setActiveTab('dhcp-leases')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeTab === 'dhcp-leases'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🧾 DHCP Leases
        </button>
        <button
          onClick={() => setActiveTab('ip-binding')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeTab === 'ip-binding'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🧷 IP Binding
        </button>
        <button
          onClick={() => setActiveTab('walled-garden')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeTab === 'walled-garden'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🌍 Walled Garden
        </button>
        <button
          onClick={() => setActiveTab('bandwidth')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeTab === 'bandwidth'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📈 Bandwidth
        </button>
      </div>

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black">📊 MikroTik System Status</h2>
              <p className="mt-1 text-sm text-gray-500">ภาพรวมสถานะเครื่องและจำนวนผู้ใช้งานที่สำคัญ</p>
            </div>
            {systemStatus?.dataSource && (
              <div className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                systemStatus.dataSource.includes('REAL')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {systemStatus.dataSource.includes('REAL') ? '✓ ' : '⚠ '}{systemStatus.dataSource}
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-500">กำลังโหลด...</div>
          ) : systemStatus ? (
            <>
              <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-5 text-white">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Router</p>
                    <h3 className="text-2xl font-bold">{systemStatus.routerName || systemStatus['board-name']}</h3>
                    <p className="mt-1 text-sm text-blue-100">
                      IP: <span className="font-semibold text-white">{systemStatus.host || '-'}</span>
                      {' • '}
                      Version: <span className="font-semibold text-white">{systemStatus.version || '-'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                      {systemStatus.connected ? '🟢 Online' : '🔴 Offline'}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                      🕐 {lastUpdate || 'ล่าสุด'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">Uptime</p>
                  <p className="mt-2 text-xl font-bold text-blue-950">{systemStatus.uptime || 'N/A'}</p>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-violet-700">CPU Load</p>
                    <span className="text-sm font-bold text-violet-900">{cpuLoad !== null ? `${cpuLoad}%` : 'N/A'}</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-violet-100">
                    <div
                      className={`h-2 rounded-full ${getUsageBarColor(cpuLoad)}`}
                      style={{ width: `${cpuLoad ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-violet-700">CPU Cores: {systemStatus.cpu || '-'}</p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-emerald-700">RAM Usage</p>
                    <span className="text-sm font-bold text-emerald-900">{memoryUsage !== null ? `${memoryUsage}%` : 'N/A'}</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-emerald-100">
                    <div
                      className={`h-2 rounded-full ${getUsageBarColor(memoryUsage)}`}
                      style={{ width: `${memoryUsage ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-emerald-700">Free {systemStatus.freememory || '-'} / Total {systemStatus.totalmemory || '-'}</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">Active Hotspot Users</p>
                  <p className="mt-2 text-xl font-bold text-amber-950">
                    {summary.activeUsers ?? 0} / {summary.totalUsers ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">Disabled: {summary.disabledUsers ?? 0}</p>
                </div>

                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-700">Online Interfaces</p>
                  <p className="mt-2 text-xl font-bold text-cyan-950">
                    {summary.onlineInterfaces ?? 0} / {summary.totalInterfaces ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-cyan-700">พอร์ตที่พร้อมใช้งาน</p>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm text-rose-700">Pending Approvals</p>
                  <p className="mt-2 text-xl font-bold text-rose-950">{summary.pendingApprovals ?? 0}</p>
                  <p className="mt-1 text-xs text-rose-700">คำขอที่รอ admin อนุมัติ</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-gray-900">รายละเอียดระบบ</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between gap-3"><span>Router IP</span><span className="font-semibold text-gray-900">{systemStatus.host || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span>Architecture</span><span className="font-semibold text-gray-900">{systemStatus.architecture || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span>Platform</span><span className="font-semibold text-gray-900">{systemStatus.platform || `RouterOS ${systemStatus.os_version || ''}`}</span></div>
                    <div className="flex justify-between gap-3"><span>Build Time</span><span className="font-semibold text-gray-900">{systemStatus['build-time'] || '-'}</span></div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Storage</h3>
                    <span className="text-sm font-semibold text-gray-900">{diskUsage !== null ? `${diskUsage}% used` : 'N/A'}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${getUsageBarColor(diskUsage)}`}
                      style={{ width: `${diskUsage ?? 0}%` }}
                    />
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between gap-3"><span>Free Disk</span><span className="font-semibold text-gray-900">{systemStatus.freedisk || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span>Total Disk</span><span className="font-semibold text-gray-900">{systemStatus.totaldisk || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span>Data Source</span><span className="font-semibold text-gray-900">{systemStatus.dataSource || '-'}</span></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-500">ไม่มีข้อมูล</div>
          )}
        </div>
      )}

      {/* Interfaces Tab */}
      {activeTab === 'interfaces' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">🌐 อินเทอร์เฟส</h2>
            {interfaces && interfaces.length > 0 && interfaces[0].dataSource && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                interfaces[0].dataSource.includes('REAL')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {interfaces[0].dataSource.includes('REAL') ? '✓ ' : '⚠ '}{interfaces[0].dataSource}
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : interfaces ? (
            <div className="space-y-4">
              {interfaces.map((iface, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedInterface(selectedInterface === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(iface.running)}`}>
                        {iface.running ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                      <span className="font-bold text-black">{iface.name}</span>
                      <span className="text-gray-500 text-sm">({iface.type})</span>
                    </div>
                    <span className="text-gray-500">
                      {selectedInterface === idx ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {selectedInterface === idx && (
                    <div className="mt-4 pt-4 border-t border-gray-300 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-gray-600 text-sm">RX Packets</p>
                        <p className="font-semibold text-black">{iface.stats['rx-packets']}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">TX Packets</p>
                        <p className="font-semibold text-black">{iface.stats['tx-packets']}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">RX Bytes</p>
                        <p className="font-semibold text-black">{iface.stats['rx-bytes']}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">TX Bytes</p>
                        <p className="font-semibold text-black">{iface.stats['tx-bytes']}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">ไม่มีข้อมูล</div>
          )}
        </div>
      )}

      {/* Hotspot Users Tab */}
      {activeTab === 'hotspot' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">👥 ผู้ใช้ Hotspot</h2>
            {hotspotUsers && hotspotUsers.length > 0 && hotspotUsers[0].dataSource && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                hotspotUsers[0].dataSource.includes('REAL')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {hotspotUsers[0].dataSource.includes('REAL') ? '✓ ' : '⚠ '}{hotspotUsers[0].dataSource}
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : hotspotUsers ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div>
                  จำนวนผู้ใช้ทั้งหมด: <span className="font-bold">{hotspotUsers.length}</span>
                </div>
                <button
                  onClick={fetchHotspotUsers}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-black font-semibold">
                    <tr>
                      <th className="px-4 py-3">ชื่อผู้ใช้</th>
                      <th className="px-4 py-3">Profile</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3">Speed Limit</th>
                      <th className="px-4 py-3">หมายเหตุ</th>
                      <th className="px-4 py-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hotspotUsers.map((user, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-black">{user.name}</td>
                        <td className="px-4 py-3 text-gray-700">{user.profile}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.disabled
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {user.disabled ? '🔴 Disabled' : '🟢 Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{user['last-login'] || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          ⬆️ {user['upload-limit'] || '-'} / ⬇️ {user['download-limit'] || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.comment || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleHotspotUserAction(user.name, user.disabled ? 'enable' : 'disable')}
                              disabled={loading}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:bg-gray-400 ${
                                user.disabled
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-amber-600 hover:bg-amber-700'
                              }`}
                            >
                              {user.disabled ? '🟢 Enable' : '⛔ Disable'}
                            </button>
                            <button
                              onClick={() => handleHotspotUserAction(user.name, 'delete')}
                              disabled={loading}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:bg-gray-400"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">ไม่มีข้อมูล</div>
          )}
        </div>
      )}

      {/* DHCP Leases Tab */}
      {activeTab === 'dhcp-leases' && (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black">🧾 DHCP Server Leases</h2>
              <p className="mt-1 text-sm text-gray-500">แสดง lease ของ DHCP Server พร้อมช่องค้นหาด้านบนเพื่อกรองข้อมูลได้เร็วขึ้น</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
              แสดงผล: <span className="font-bold">{filteredDhcpLeases.length}</span> / {leaseSummary.total} รายการ
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Total Leases</p>
              <p className="mt-2 text-2xl font-bold text-blue-950">{leaseSummary.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">Active / Bound</p>
              <p className="mt-2 text-2xl font-bold text-emerald-950">{leaseSummary.active}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-700">Dynamic</p>
              <p className="mt-2 text-2xl font-bold text-amber-950">{leaseSummary.dynamic}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-sm text-violet-700">Static</p>
              <p className="mt-2 text-2xl font-bold text-violet-950">{leaseSummary.static}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1 xl:col-span-2">
              <span className="text-sm font-medium text-gray-700">ค้นหา</span>
              <input
                value={leaseFilters.search}
                onChange={(e) => setLeaseFilters({ ...leaseFilters, search: e.target.value })}
                placeholder="ค้นหา IP, MAC, host name, server หรือ comment"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Server</span>
              <select
                value={leaseFilters.server}
                onChange={(e) => setLeaseFilters({ ...leaseFilters, server: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                {leaseServerOptions.map((server) => (
                  <option key={`lease-filter-${server.id}`} value={server.name}>
                    {server.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Lease Type</span>
              <select
                value={leaseFilters.type}
                onChange={(e) => setLeaseFilters({ ...leaseFilters, type: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="all">all</option>
                <option value="dynamic">dynamic</option>
                <option value="static">static</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <select
                  value={leaseFilters.status}
                  onChange={(e) => setLeaseFilters({ ...leaseFilters, status: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="all">all</option>
                  <option value="active">active</option>
                  <option value="bound">bound</option>
                  <option value="waiting">waiting</option>
                  <option value="offered">offered</option>
                  <option value="blocked">blocked</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setLeaseFilters({ search: '', server: 'all', type: 'all', status: 'all' })}
                className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                ล้าง
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <div>
              Active leases: <span className="font-bold">{leaseSummary.active}</span>
              <span className="mx-2">•</span>
              Waiting: <span className="font-bold">{leaseSummary.waiting}</span>
            </div>
            <button
              onClick={fetchDhcpLeases}
              disabled={loading}
              className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white transition hover:bg-sky-700 disabled:bg-gray-400"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-black font-semibold">
                  <tr>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Active IP</th>
                    <th className="px-4 py-3">MAC Address</th>
                    <th className="px-4 py-3">Host Name</th>
                    <th className="px-4 py-3">Server</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Last Seen / Expires</th>
                    <th className="px-4 py-3">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDhcpLeases.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                        {dhcpLeases.length === 0 ? 'ยังไม่มีข้อมูล DHCP Lease จาก MikroTik' : 'ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก'}
                      </td>
                    </tr>
                  ) : (
                    filteredDhcpLeases.map((lease) => {
                      const leaseStatus = lease.blocked ? 'blocked' : lease.disabled ? 'disabled' : String(lease.status || 'unknown').toLowerCase();
                      const statusClass = ['bound', 'offered'].includes(leaseStatus)
                        ? 'bg-green-100 text-green-800'
                        : leaseStatus === 'waiting'
                          ? 'bg-amber-100 text-amber-800'
                          : ['blocked', 'disabled'].includes(leaseStatus)
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700';

                      return (
                        <tr key={lease.id || `${lease.address}-${lease.macAddress}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-black">{lease.address || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{lease.activeAddress || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{lease.macAddress || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{lease.hostName || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{lease.server || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                              {leaseStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lease.dynamic ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>
                              {lease.dynamic ? '⚡ Dynamic' : '📌 Static'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">
                            <div>Seen: {lease.lastSeen || '-'}</div>
                            <div>Expires: {lease.expiresAfter || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{lease.comment || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* IP Binding Tab */}
      {activeTab === 'ip-binding' && (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black">🧷 IP Binding</h2>
              <p className="mt-1 text-sm text-gray-500">เพิ่ม แก้ไข ลบ และปิด/เปิดการใช้งาน IP Binding บน MikroTik ได้จากหน้าจอนี้</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
              แสดงผล: <span className="font-bold">{filteredIpBindings.length}</span> / {bindingSummary.total} รายการ
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">Active</p>
              <p className="mt-2 text-2xl font-bold text-emerald-950">{bindingSummary.active}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">Disabled</p>
              <p className="mt-2 text-2xl font-bold text-rose-950">{bindingSummary.disabled}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-700">Bypassed</p>
              <p className="mt-2 text-2xl font-bold text-amber-950">{bindingSummary.bypassed}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Servers</p>
              <p className="mt-2 text-2xl font-bold text-blue-950">{bindingServerOptions.length}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1 xl:col-span-2">
              <span className="text-sm font-medium text-gray-700">ค้นหา</span>
              <input
                value={bindingFilters.search}
                onChange={(e) => setBindingFilters({ ...bindingFilters, search: e.target.value })}
                placeholder="ค้นหา IP, MAC, server หรือ comment"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Server</span>
              <select
                value={bindingFilters.server}
                onChange={(e) => setBindingFilters({ ...bindingFilters, server: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                {bindingServerOptions.map((server) => (
                  <option key={`filter-${server.id || server.name}`} value={server.name}>
                    {server.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Type</span>
              <select
                value={bindingFilters.type}
                onChange={(e) => setBindingFilters({ ...bindingFilters, type: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="all">all</option>
                <option value="regular">regular</option>
                <option value="bypassed">bypassed</option>
                <option value="blocked">blocked</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <select
                  value={bindingFilters.status}
                  onChange={(e) => setBindingFilters({ ...bindingFilters, status: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="all">all</option>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setBindingFilters({ search: '', server: 'all', type: 'all', status: 'all' })}
                className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                ล้าง
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveIpBinding} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingBindingId ? '✏️ แก้ไข IP Binding' : '➕ เพิ่ม IP Binding ใหม่'}
              </h3>
              {editingBindingId && (
                <button
                  type="button"
                  onClick={resetBindingForm}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-300"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">IP Address</span>
                <input
                  value={bindingForm.address}
                  onChange={(e) => setBindingForm({ ...bindingForm, address: e.target.value })}
                  placeholder="เช่น 192.168.10.50"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">MAC Address</span>
                <input
                  value={bindingForm.macAddress}
                  onChange={(e) => setBindingForm({ ...bindingForm, macAddress: e.target.value.toUpperCase() })}
                  placeholder="เช่น AA:BB:CC:DD:EE:FF"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Type</span>
                <select
                  value={bindingForm.type}
                  onChange={(e) => setBindingForm({ ...bindingForm, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="regular">regular</option>
                  <option value="bypassed">bypassed</option>
                  <option value="blocked">blocked</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Server</span>
                <select
                  value={bindingForm.server || 'all'}
                  onChange={(e) => setBindingForm({ ...bindingForm, server: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  {bindingServerOptions.map((server) => (
                    <option key={server.id || server.name} value={server.name}>
                      {server.name}{server.interface ? ` (${server.interface})` : ''}{server.disabled ? ' [disabled]' : ''}
                    </option>
                  ))}
                  {bindingForm.server && !(hotspotServers || []).some((server) => server.name === bindingForm.server) && (
                    <option value={bindingForm.server}>{bindingForm.server}</option>
                  )}
                </select>
                <p className="text-xs text-slate-500">ดึงรายชื่อจริงจาก MikroTik เพื่อให้เลือกได้ถูกต้อง</p>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">To Address (optional)</span>
                <input
                  value={bindingForm.toAddress}
                  onChange={(e) => setBindingForm({ ...bindingForm, toAddress: e.target.value })}
                  placeholder="เช่น 192.168.10.60"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Comment</span>
                <input
                  value={bindingForm.comment}
                  onChange={(e) => setBindingForm({ ...bindingForm, comment: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={bindingForm.disabled}
                onChange={(e) => setBindingForm({ ...bindingForm, disabled: e.target.checked })}
              />
              สร้าง/บันทึกเป็นสถานะ Disabled
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
              >
                {editingBindingId ? '💾 บันทึกการแก้ไข' : '➕ เพิ่ม IP Binding'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetchHotspotServers();
                  await fetchIpBindings();
                }}
                disabled={loading}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-gray-400"
              >
                🔄 Refresh List
              </button>
            </div>
          </form>

          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-black font-semibold">
                  <tr>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">MAC Address</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Server</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredIpBindings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                        {ipBindings.length === 0 ? 'ยังไม่มี IP Binding บน MikroTik' : 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก'}
                      </td>
                    </tr>
                  ) : (
                    filteredIpBindings.map((binding) => (
                      <tr key={binding.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-black">{binding.address || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{binding.macAddress || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{binding.type || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{binding.server || 'all'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${binding.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {binding.disabled ? '🔴 Disabled' : '🟢 Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{binding.comment || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEditIpBinding(binding)}
                              disabled={loading}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleIpBindingAction(binding, binding.disabled ? 'enable' : 'disable')}
                              disabled={loading}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:bg-gray-400 ${binding.disabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                              {binding.disabled ? '🟢 Enable' : '⛔ Disable'}
                            </button>
                            <button
                              onClick={() => handleIpBindingAction(binding, 'delete')}
                              disabled={loading}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:bg-gray-400"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Walled Garden Tab */}
      {activeTab === 'walled-garden' && (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black">🌍 Walled Garden</h2>
              <p className="mt-1 text-sm text-gray-500">จัดการรายการเว็บไซต์หรือ path ที่อนุญาตก่อน login บน MikroTik ได้จากหน้าจอนี้</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
              แสดงผล: <span className="font-bold">{filteredWalledGardens.length}</span> / {walledGardenSummary.total} รายการ
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">Active</p>
              <p className="mt-2 text-2xl font-bold text-emerald-950">{walledGardenSummary.active}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">Disabled</p>
              <p className="mt-2 text-2xl font-bold text-rose-950">{walledGardenSummary.disabled}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Allow</p>
              <p className="mt-2 text-2xl font-bold text-blue-950">{walledGardenSummary.allow}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-700">Deny</p>
              <p className="mt-2 text-2xl font-bold text-amber-950">{walledGardenSummary.deny}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1 xl:col-span-2">
              <span className="text-sm font-medium text-gray-700">ค้นหา</span>
              <input
                value={walledGardenFilters.search}
                onChange={(e) => setWalledGardenFilters({ ...walledGardenFilters, search: e.target.value })}
                placeholder="ค้นหา host, path, protocol หรือ comment"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Server</span>
              <select
                value={walledGardenFilters.server}
                onChange={(e) => setWalledGardenFilters({ ...walledGardenFilters, server: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                {bindingServerOptions.map((server) => (
                  <option key={`wg-filter-${server.id || server.name}`} value={server.name}>
                    {server.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Action</span>
              <select
                value={walledGardenFilters.action}
                onChange={(e) => setWalledGardenFilters({ ...walledGardenFilters, action: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="all">all</option>
                <option value="allow">allow</option>
                <option value="deny">deny</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <select
                  value={walledGardenFilters.status}
                  onChange={(e) => setWalledGardenFilters({ ...walledGardenFilters, status: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="all">all</option>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setWalledGardenFilters({ search: '', server: 'all', action: 'all', status: 'all' })}
                className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                ล้าง
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveWalledGarden} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingWalledGardenId ? '✏️ แก้ไข Walled Garden' : '➕ เพิ่ม Walled Garden ใหม่'}
              </h3>
              {editingWalledGardenId && (
                <button
                  type="button"
                  onClick={resetWalledGardenForm}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-300"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Destination Host</span>
                <input
                  value={walledGardenForm.dstHost}
                  onChange={(e) => setWalledGardenForm({ ...walledGardenForm, dstHost: e.target.value })}
                  placeholder="เช่น *.facebook.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Path</span>
                <input
                  value={walledGardenForm.path}
                  onChange={(e) => setWalledGardenForm({ ...walledGardenForm, path: e.target.value })}
                  placeholder="เช่น /login หรือ /api/*"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Destination Port</span>
                <input
                  value={walledGardenForm.dstPort}
                  onChange={(e) => setWalledGardenForm({ ...walledGardenForm, dstPort: e.target.value })}
                  placeholder="เช่น 80,443"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Protocol</span>
                <select
                  value={walledGardenForm.protocol}
                  onChange={(e) => setWalledGardenForm({ ...walledGardenForm, protocol: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="any">any</option>
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Server</span>
                <select
                  value={walledGardenForm.server}
                  onChange={(e) => setWalledGardenForm({ ...walledGardenForm, server: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  {bindingServerOptions.map((server) => (
                    <option key={`wg-${server.id || server.name}`} value={server.name}>
                      {server.name}{server.interface ? ` (${server.interface})` : ''}{server.disabled ? ' [disabled]' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Action</span>
                <select
                  value={walledGardenForm.action}
                  onChange={(e) => setWalledGardenForm({ ...walledGardenForm, action: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="allow">allow</option>
                  <option value="deny">deny</option>
                </select>
              </label>
              <label className="space-y-1 md:col-span-2 xl:col-span-3">
                <span className="text-sm font-medium text-gray-700">Comment</span>
                <input
                  value={walledGardenForm.comment}
                  onChange={(e) => setWalledGardenForm({ ...walledGardenForm, comment: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={walledGardenForm.disabled}
                onChange={(e) => setWalledGardenForm({ ...walledGardenForm, disabled: e.target.checked })}
              />
              สร้าง/บันทึกเป็นสถานะ Disabled
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
              >
                {editingWalledGardenId ? '💾 บันทึกการแก้ไข' : '➕ เพิ่ม Walled Garden'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetchHotspotServers();
                  await fetchWalledGardens();
                }}
                disabled={loading}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-gray-400"
              >
                🔄 Refresh List
              </button>
            </div>
          </form>

          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-black font-semibold">
                  <tr>
                    <th className="px-4 py-3">Dst Host</th>
                    <th className="px-4 py-3">Path</th>
                    <th className="px-4 py-3">Port</th>
                    <th className="px-4 py-3">Protocol</th>
                    <th className="px-4 py-3">Server</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredWalledGardens.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                        {walledGardens.length === 0 ? 'ยังไม่มี Walled Garden บน MikroTik' : 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก'}
                      </td>
                    </tr>
                  ) : (
                    filteredWalledGardens.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-black">{rule.dstHost || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{rule.path || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{rule.dstPort || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{rule.protocol || 'any'}</td>
                        <td className="px-4 py-3 text-gray-700">{rule.server || 'all'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(rule.action || 'allow') === 'deny' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            {(rule.action || 'allow') === 'deny' ? '🚫 deny' : '✅ allow'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rule.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {rule.disabled ? '🔴 Disabled' : '🟢 Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{rule.comment || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEditWalledGarden(rule)}
                              disabled={loading}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleWalledGardenAction(rule, rule.disabled ? 'enable' : 'disable')}
                              disabled={loading}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:bg-gray-400 ${rule.disabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                              {rule.disabled ? '🟢 Enable' : '⛔ Disable'}
                            </button>
                            <button
                              onClick={() => handleWalledGardenAction(rule, 'delete')}
                              disabled={loading}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:bg-gray-400"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bandwidth Tab */}
      {activeTab === 'bandwidth' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">📈 Bandwidth Monitor</h2>
            {bandwidth && bandwidth.length > 0 && bandwidth[0].dataSource && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                bandwidth[0].dataSource.includes('REAL')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {bandwidth[0].dataSource.includes('REAL') ? '✓ ' : '⚠ '}{bandwidth[0].dataSource}
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : bandwidth && bandwidth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <th className="border border-gray-300 px-4 py-3 text-left font-bold">🔌 Interface</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold">📥 RX-Bytes</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold">📤 TX-Bytes</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold">📦 RX-Packets</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold">📦 TX-Packets</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold">⚠️ RX-Errors</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold">⚠️ TX-Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {bandwidth.map((bw, idx) => (
                    <tr 
                      key={idx} 
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">
                        {bw.interface}
                        {bw.running && <span className="ml-2 text-green-600">●</span>}
                        {!bw.running && <span className="ml-2 text-gray-400">●</span>}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {bw['total-rx']}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {bw['total-tx']}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {bw['rx-packets']}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {bw['tx-packets']}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${bw['rx-errors'] > 0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-green-600'}`}>
                          {bw['rx-errors']}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${bw['tx-errors'] > 0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-green-600'}`}>
                          {bw['tx-errors']}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">ไม่มีข้อมูล</div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center pt-4 gap-2">
        <button
          onClick={() => {
            if (activeTab === 'system') fetchSystemStatus();
            if (activeTab === 'interfaces') fetchInterfaces();
            if (activeTab === 'hotspot') fetchHotspotUsers();
            if (activeTab === 'dhcp-leases') fetchDhcpLeases();
            if (activeTab === 'ip-binding') {
              fetchIpBindings();
              fetchHotspotServers();
            }
            if (activeTab === 'walled-garden') {
              fetchWalledGardens();
              fetchHotspotServers();
            }
            if (activeTab === 'bandwidth') fetchBandwidth();
          }}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
        >
          {loading ? '⟳ กำลังโหลด...' : '⟳ รีเฟรชเดี๋ยวนี้'}
        </button>
        {autoRefreshInterval && (
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-semibold flex items-center gap-2">
            ✓ Auto-refresh ทุก {autoRefreshInterval / 1000 === 60 ? '1 นาที' : autoRefreshInterval / 1000 + ' วินาที'}
          </div>
        )}
      </div>
    </div>
  );
}
