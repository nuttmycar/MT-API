import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000/api`;

export default function VersionInfo({ showFull = false }) {
  const [version, setVersion] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchVersion();
  }, []);

  const fetchVersion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/version`);
      const data = await response.json();
      if (data.success) {
        setVersion(data);
      }
    } catch (error) {
      console.error('Failed to fetch version:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/version/history`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!version) {
    return (
      <div className="text-xs text-gray-500">
        {loading ? '⟳ Loading...' : '---'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Version Badge - Compact */}
      {!showFull && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">{version.version}</span>
            {version.buildNumber && (
              <span className="ml-2 text-gray-500">
                (Build {version.buildNumber})
              </span>
            )}
          </div>
          <button
            onClick={fetchHistory}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            History
          </button>
        </div>
      )}

      {/* Full Version Info */}
      {showFull && version && (
        <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-900">
              {version.displayName}
            </h3>
            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
              v{version.version}
            </span>
          </div>

          {version.description && (
            <p className="text-sm text-gray-600">{version.description}</p>
          )}

          {version.releaseDate && (
            <div className="text-sm text-gray-500">
              📅 Released: {new Date(version.releaseDate).toLocaleDateString()}
            </div>
          )}

          {version.buildNumber && (
            <div className="text-sm text-gray-500">
              🔨 Build: {version.buildNumber}
            </div>
          )}

          {/* Components */}
          {version.components && (
            <div className="grid gap-2 text-sm">
              <div className="font-semibold text-gray-700">Components:</div>
              <div className="ml-2 space-y-1 text-gray-600">
                {version.components.backend && (
                  <div>
                    Backend: {version.components.backend.version}
                    <span className="text-xs ml-2 text-gray-500">
                      ({version.components.backend.framework})
                    </span>
                  </div>
                )}
                {version.components.frontend && (
                  <div>
                    Frontend: {version.components.frontend.version}
                    <span className="text-xs ml-2 text-gray-500">
                      ({version.components.frontend.framework})
                    </span>
                  </div>
                )}
                {version.components.database && (
                  <div>
                    Database: {version.components.database.version}
                    <span className="text-xs ml-2 text-gray-500">
                      ({version.components.database.type})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compatibility */}
          {version.compatibility && (
            <div className="grid gap-2 text-sm border-t pt-3">
              <div className="font-semibold text-gray-700">Supported:</div>
              <div className="text-xs text-gray-600">
                <div>RouterOS: {version.compatibility.routerOS?.join(', ')}</div>
                <div>Node: {version.compatibility.nodeVersion}</div>
                <div>Browsers: {version.compatibility.browsers?.join(', ')}</div>
              </div>
            </div>
          )}

          {/* History Button */}
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="w-full mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '⟳ Loading...' : '📋 View Version History'}
          </button>
        </div>
      )}

      {/* Version History Modal */}
      {showHistory && history.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-96 w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Version History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {history.map((v, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg text-gray-900">
                        v{v.version}
                      </span>
                      <span className="ml-3 text-xs text-gray-500">
                        {new Date(v.date).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        v.status === 'Current'
                          ? 'bg-green-100 text-green-800'
                          : v.status === 'Stable'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>

                  {v.features && v.features.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-gray-700">
                        Features:
                      </div>
                      <ul className="ml-4 list-disc space-y-1 text-xs text-gray-600">
                        {v.features.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {v.bugFixes && v.bugFixes.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-gray-700">
                        Bug Fixes:
                      </div>
                      <ul className="ml-4 list-disc space-y-1 text-xs text-gray-600">
                        {v.bugFixes.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHistory(false)}
              className="mt-4 w-full rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
