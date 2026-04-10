import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function SystemStatus({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [includeProcesses, setIncludeProcesses] = useState(false);
  const [error, setError] = useState('');
  const isFetchingRef = useRef(false);

  const fetchSystemStats = async (forceRefresh = false, withProcesses = includeProcesses) => {
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError('');
      console.log('[SystemStatus] Fetching MikroTik system stats...', { withProcesses, forceRefresh });

      const params = new URLSearchParams({
        includeProcesses: String(withProcesses),
      });

      if (forceRefresh) {
        params.set('refresh', 'true');
      }

      const response = await fetch(`${API_BASE}/system/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      console.log('[SystemStatus] Data received:', data);
      setStats(data);
    } catch (fetchError) {
      console.error('[SystemStatus] Error:', fetchError);
      setError(fetchError.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchSystemStats(false, includeProcesses);

    if (!autoRefresh) return undefined;

    const interval = setInterval(() => {
      fetchSystemStats(false, includeProcesses);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, token, includeProcesses]);

  const getTone = (value, warning = 60, danger = 80) => {
    if (value >= danger) {
      return {
        text: 'text-red-300',
        chip: 'bg-red-500/15 text-red-200 border border-red-500/30',
        bar: 'from-red-500 to-rose-400',
      };
    }

    if (value >= warning) {
      return {
        text: 'text-amber-300',
        chip: 'bg-amber-500/15 text-amber-100 border border-amber-500/30',
        bar: 'from-amber-400 to-yellow-300',
      };
    }

    return {
      text: 'text-emerald-300',
      chip: 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/30',
      bar: 'from-emerald-500 to-cyan-400',
    };
  };

  const ProgressBar = ({ value, max = 100, tone = 'from-blue-500 to-cyan-400' }) => {
    const safeMax = max > 0 ? max : 100;
    const percentage = Math.min((value / safeMax) * 100, 100);

    return (
      <div className="h-2.5 w-full rounded-full bg-slate-800">
        <div
          className={`h-2.5 rounded-full bg-gradient-to-r ${tone} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const StatCard = ({ icon, title, value, subtitle, toneClass }) => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/10 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );

  const cpuUsage = Number(stats?.cpu?.usage ?? 0);
  const ramPercent = Number(stats?.ram?.percent ?? 0);
  const diskPercent = Number(stats?.disk?.percent ?? 0);
  const cpuTone = getTone(cpuUsage, 50, 80);
  const ramTone = getTone(ramPercent, 50, 80);
  const diskTone = getTone(diskPercent, 60, 85);
  const healthy = cpuUsage < 80 && ramPercent < 80 && diskPercent < 85;
  const lastUpdated = stats?.timestamp ? new Date(stats.timestamp).toLocaleString('th-TH') : '-';
  const processes = stats?.processes?.list ? [...stats.processes.list].sort((a, b) => b.cpu - a.cpu).slice(0, 6) : [];
  const processNote = stats?.processes?.note || '';

  const alerts = [];
  if (stats) {
    if (cpuUsage >= 80) alerts.push({ message: `CPU สูง ${cpuUsage}%`, className: 'bg-red-500/10 text-red-200 border-red-500/30' });
    if (ramPercent >= 80) alerts.push({ message: `RAM สูง ${ramPercent}%`, className: 'bg-amber-500/10 text-amber-100 border-amber-500/30' });
    if (diskPercent >= 85) alerts.push({ message: `Storage ใกล้เต็ม ${diskPercent}%`, className: 'bg-rose-500/10 text-rose-200 border-rose-500/30' });
    if (alerts.length === 0) alerts.push({ message: 'ระบบทำงานอยู่ในเกณฑ์ปกติ', className: 'bg-emerald-500/10 text-emerald-100 border-emerald-500/30' });
  }

  return (
    <div className="space-y-6 text-gray-100">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-6 shadow-2xl shadow-blue-950/20">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/80">System Overview</p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">สถานะระบบ</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              ภาพรวมสุขภาพเครื่อง MikroTik พร้อม resource usage, storage และ process สำคัญในมุมมองเดียว
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchSystemStats(true, includeProcesses)}
              disabled={loading}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:bg-slate-600 disabled:text-slate-300"
            >
              {loading ? 'กำลังโหลด...' : '🔄 รีเฟรช'}
            </button>

            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-cyan-400"
              />
              Auto refresh
            </label>

            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none"
              >
                <option value={5}>5 วินาที</option>
                <option value={10}>10 วินาที</option>
                <option value={30}>30 วินาที</option>
                <option value={60}>1 นาที</option>
              </select>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-semibold ${healthy ? 'bg-emerald-500/15 text-emerald-100' : 'bg-amber-500/15 text-amber-100'}`}>
            {healthy ? '🟢 Healthy' : '⚠️ Need Attention'}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-100">
            📡 {stats?.source || 'MikroTik RouterOS'}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-100">
            🕐 {lastUpdated}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-100 shadow-lg shadow-red-900/10">
          ⚠️ {error}
        </div>
      )}

      {stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="🧠"
              title="CPU Load"
              value={`${cpuUsage}%`}
              subtitle={`${stats.cpu.cores} cores`}
              toneClass={cpuTone.text}
            />
            <StatCard
              icon="💾"
              title="RAM Usage"
              value={`${ramPercent}%`}
              subtitle={`${stats.ram.used} / ${stats.ram.total} MB`}
              toneClass={ramTone.text}
            />
            <StatCard
              icon="🗄️"
              title="Storage"
              value={`${diskPercent}%`}
              subtitle={`${stats.disk.used} / ${stats.disk.total} GB`}
              toneClass={diskTone.text}
            />
            <StatCard
              icon="⏱️"
              title="Uptime"
              value={stats.uptime.formatted}
              subtitle="Router online time"
              toneClass="text-cyan-300"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Resource Health</h2>
                  <p className="text-sm text-slate-400">ติดตาม CPU, RAM และ Storage แบบอ่านง่าย</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${healthy ? 'bg-emerald-500/15 text-emerald-100' : 'bg-amber-500/15 text-amber-100'}`}>
                  {healthy ? 'Stable' : 'Monitor closely'}
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">CPU Usage</span>
                    <span className={`font-bold ${cpuTone.text}`}>{cpuUsage}%</span>
                  </div>
                  <ProgressBar value={cpuUsage} tone={cpuTone.bar} />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">RAM Usage</span>
                    <span className={`font-bold ${ramTone.text}`}>{ramPercent}%</span>
                  </div>
                  <ProgressBar value={stats.ram.used} max={stats.ram.total} tone={ramTone.bar} />
                  <p className="mt-2 text-xs text-slate-500">Free {stats.ram.free} MB จากทั้งหมด {stats.ram.total} MB</p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Disk Usage</span>
                    <span className={`font-bold ${diskTone.text}`}>{diskPercent}%</span>
                  </div>
                  <ProgressBar value={stats.disk.used} max={stats.disk.total} tone={diskTone.bar} />
                  <p className="mt-2 text-xs text-slate-500">Free {stats.disk.free} GB จากทั้งหมด {stats.disk.total} GB</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
              <h2 className="text-xl font-bold text-white">Smart Alerts</h2>
              <p className="mt-1 text-sm text-slate-400">สรุปสิ่งที่ควรสังเกตในตอนนี้</p>
              <div className="mt-4 space-y-3">
                {alerts.map((alert, index) => (
                  <div key={index} className={`rounded-xl border px-3 py-3 text-sm ${alert.className}`}>
                    {alert.message}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-slate-800/70 p-4">
                <p className="text-sm text-slate-300">Quick Facts</p>
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between gap-3">
                    <span>Board</span>
                    <span className="font-semibold text-slate-100">{stats.system.boardName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Version</span>
                    <span className="font-semibold text-slate-100">{stats.system.version}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Architecture</span>
                    <span className="font-semibold text-slate-100">{stats.system.architecture}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
              <h2 className="text-xl font-bold text-white">System Details</h2>
              <p className="mt-1 text-sm text-slate-400">ข้อมูลสำคัญของ RouterOS</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-xs text-slate-400">Board Name</p>
                  <p className="mt-1 font-semibold text-white">{stats.system.boardName}</p>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-xs text-slate-400">RouterOS Version</p>
                  <p className="mt-1 font-semibold text-white">{stats.system.version}</p>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-xs text-slate-400">Architecture</p>
                  <p className="mt-1 font-semibold text-white">{stats.system.architecture}</p>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-xs text-slate-400">Source</p>
                  <p className="mt-1 font-semibold text-white">{stats.source}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Top Processes</h2>
                  <p className="text-sm text-slate-400">โหลดเฉพาะตอนต้องการ เพื่อลดความหน่วงของหน้า</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                    Total {stats.processes.total}
                  </span>
                  {!includeProcesses && (
                    <button
                      onClick={() => {
                        setIncludeProcesses(true);
                        fetchSystemStats(true, true);
                      }}
                      disabled={loading}
                      className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-400"
                    >
                      โหลด Process
                    </button>
                  )}
                </div>
              </div>

              {processes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 p-4 text-sm text-slate-400">
                  {processNote || 'ยังไม่ได้โหลดรายการ process เพื่อลดการหน่วงของหน้า Status'}
                </div>
              ) : (
                <div className="space-y-3">
                  {processes.map((proc, idx) => (
                    <div key={`${proc.name}-${idx}`} className="rounded-xl bg-slate-800/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold text-white">{proc.name}</p>
                          <p className="text-xs text-slate-400">PID: {proc.pid} • State: {proc.state}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${proc.cpu > 10 ? 'text-red-300' : 'text-emerald-300'}`}>
                            {proc.cpu.toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-400">{proc.memory} KB</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 text-center shadow-lg shadow-black/10">
            <p className="text-sm text-slate-400">Last updated</p>
            <p className="mt-1 font-mono text-white">{lastUpdated}</p>
            {autoRefresh && (
              <p className="mt-2 text-xs text-slate-500">⏱️ อัปเดตอัตโนมัติทุก {refreshInterval} วินาที</p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 py-12 text-center text-slate-400 shadow-lg shadow-black/10">
          {loading ? '⏳ กำลังโหลดข้อมูลจาก MikroTik...' : '🔄 คลิกรีเฟรชเพื่อดูข้อมูลระบบ'}
        </div>
      )}
    </div>
  );
}
