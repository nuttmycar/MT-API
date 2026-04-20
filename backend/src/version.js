// Version information for MT-API
// This file is auto-generated and should be updated with each release

module.exports = {
  app: {
    name: 'MT-API',
    displayName: 'MikroTik Hotspot Management System',
    version: '1.3.0',
    buildNumber: '20260420',
    releaseDate: '2026-04-20',
    description: 'Comprehensive MikroTik Hotspot management system with analytics and smart features',
  },
  
  features: {
    version: '1.3.0',
    releaseNotes: 'Generated Users DB Storage + QR/CSV History',
    lastUpdated: '2026-04-20',
    highlights: [
      'Generated Users saved to Database (new table: generated_users)',
      'DHCP Server Leases Management (v1.2)',
      'Ubuntu 24.04 LTS Deployment (v1.2)',
      'Smart Analytics & Alerts (v1.1)',
      'Action-Level Permissions (v1.1)',
    ],
  },

  components: {
    backend: {
      version: '1.3.0',
      framework: 'Node.js + Express',
      buildTime: '2026-04-20T00:00:00Z',
    },
    frontend: {
      version: '1.3.0',
      framework: 'React 18 + Vite + Tailwind CSS',
      buildTime: '2026-04-20T00:00:00Z',
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
      version: '1.3.0',
      date: '2026-04-20',
      status: 'Current',
      features: [
        'Generated Users persisted to Database (generated_users table)',
        'Batch label grouping for generated users',
        'Edit / Delete saved generated users',
        'Sync saved users to MikroTik',
        'Enable / Disable / Remove saved users from MikroTik',
        'Print QR coupons from saved history',
        'CSV export from saved history',
        'Status tracking: generated → synced → disabled → removed',
      ],
      bugFixes: [
        'Duplicate getMikrotikStatus import in systemRoutes.js',
      ],
    },
    {
      version: '1.2.0',
      date: '2026-04-17',
      status: 'Stable',
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
    current: '1.3.0',
    lts: '1.3.0',
    security: ['1.3.0', '1.2.x'],
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
