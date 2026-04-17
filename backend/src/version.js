// Version information for MT-API
// This file is auto-generated and should be updated with each release

module.exports = {
  app: {
    name: 'MT-API',
    displayName: 'MikroTik Hotspot Management System',
    version: '1.2.0',
    buildNumber: '20260417',
    releaseDate: '2026-04-17',
    description: 'Comprehensive MikroTik Hotspot management system with analytics and smart features',
  },
  
  features: {
    version: '1.2.0',
    releaseNotes: 'DHCP Leases + Ubuntu Deployment Suite',
    lastUpdated: '2026-04-17',
    highlights: [
      'DHCP Server Leases Management',
      'Ubuntu 24.04 LTS Deployment',
      'Smart Analytics & Alerts (v1.1)',
      'Action-Level Permissions (v1.1)',
      'Login History & Audit Logs (v1.1)',
    ],
  },

  components: {
    backend: {
      version: '1.2.0',
      framework: 'Node.js + Express',
      buildTime: '2026-04-17T12:00:00Z',
    },
    frontend: {
      version: '1.2.0',
      framework: 'React 18 + Vite + Tailwind CSS',
      buildTime: '2026-04-17T12:00:00Z',
    },
    database: {
      version: '10.6+',
      type: 'MariaDB/MySQL',
      migrations: 'Up to date',
    },
  },

  compatibility: {
    routerOS: ['v6', 'v7'],
    operatingSystems: ['Ubuntu 24.04 LTS', 'Ubuntu 22.04 LTS', 'Debian 12', 'macOS', 'Windows'],
    browsers: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'],
    nodeVersion: '18.0.0 - 20.x.x',
    npmVersion: '9.0.0+',
  },

  versionHistory: [
    {
      version: '1.2.0',
      date: '2026-04-17',
      status: 'Current',
      features: [
        'DHCP Server Leases management',
        'Ubuntu deployment automation',
        'Health check tools',
        'Quick reference documentation',
      ],
      bugFixes: [
        'DHCP lease data mapping',
        'API response consistency',
      ],
    },
    {
      version: '1.1.0',
      date: '2026-04-16',
      status: 'Stable',
      features: [
        'Smart trend analytics',
        'LINE/Telegram alerts',
        'Action-level permissions',
        'Login history tracking',
      ],
    },
    {
      version: '1.0.0',
      date: '2026-04-15',
      status: 'Release',
      features: [
        'Core hotspot management',
        'User approval workflow',
        'MikroTik integration',
        'RBAC system',
        'Backup/restore',
      ],
    },
  ],

  supportedVersions: {
    current: '1.2.0',
    lts: '1.2.0',
    security: ['1.2.0', '1.1.x'],
    deprecated: ['1.0.0'],
  },

  endpoints: {
    api: 'http://localhost:3000/api',
    health: 'http://localhost:3000/api/health',
    version: 'http://localhost:3000/api/version',
  },

  updateChannel: 'stable',
  checkForUpdates: true,
  lastChecked: new Date().toISOString(),
};
