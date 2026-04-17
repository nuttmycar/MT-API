# Version Control System Integration Guide

## Overview
The MT-API now has a comprehensive version control system that tracks application versions, provides API endpoints for version information, and displays version details in the UI.

## What Was Added

### 1. Backend Version Management
- **File**: `backend/src/version.js`
- **Purpose**: Central module exporting comprehensive version metadata
- **Content**:
  - Current version: 1.2.0
  - Build number: 20260417 (YYYYMMDD format)
  - Release date: 2026-04-17
  - Component versions (Backend, Frontend, Database)
  - Compatibility info (RouterOS v6/v7, Browsers, Node.js versions)
  - Version history with 3 major releases

### 2. API Version Endpoints
- **File**: `backend/src/routes/versionRoutes.js`
- **File**: `backend/src/controllers/versionController.js`

#### Endpoints:
```
GET /api/version
- Returns current version info
- Response: { version, buildNumber, releaseDate, components, compatibility }

GET /api/version/history
- Returns current version and full version history
- Response: { version, history: [...] }

GET /api/health
- Combined health check with version details
- Response: { status, version, buildNumber, uptime, database, nodeVersion }

GET /api/version/compatibility
- Check if client version is supported
- Query param: ?clientVersion=1.2.0
- Response: { supported, upgrade_available, latest_version }
```

### 3. Frontend Version Display
- **File**: `frontend/src/components/VersionInfo.jsx`
- **Purpose**: React component to display version in UI footer
- **Features**:
  - Compact version badge showing current version
  - Version history modal with detailed changelog
  - Component versions and compatibility info
  - Status indicators for each release

### 4. Updated Files
- **`backend/src/app.js`**: Added versionRoutes import and middleware registration
- **`backend/package.json`**: Updated version to 1.2.0
- **`frontend/package.json`**: Updated version to 1.2.0
- **`frontend/src/App.jsx`**: Added VersionInfo component to footer

### 5. Documentation
- **File**: `CHANGELOG.md` - Complete version history with all releases documented

## Version Format

### Semantic Versioning
`X.Y.Z` format where:
- **X** (Major): Breaking changes or major features (1.0.0 → 2.0.0)
- **Y** (Minor): New features without breaking changes (1.0.0 → 1.1.0)
- **Z** (Patch): Bug fixes (1.0.0 → 1.0.1)

### Build Number
`YYYYMMDD` format (20260417) for easy tracking of exact build date

## Current Version Details

| Property | Value |
|----------|-------|
| Version | 1.2.0 |
| Build Number | 20260417 |
| Release Date | April 17, 2026 |
| Status | Current |

## Version History

### v1.2.0 (April 17, 2026)
**Features:**
- DHCP Server Leases Management
- Ubuntu 24.04 LTS Deployment Suite
- Automated setup scripts
- Version control system integration

**Components:**
- Backend: Node.js + Express
- Frontend: React + Vite + Tailwind
- Database: MariaDB

### v1.1.0 (April 16, 2026)
**Features:**
- Smart Analytics with real-time tracking
- Automated alerts and notifications
- Action permissions system
- Login history logging

### v1.0.0 (April 15, 2026)
**Initial Release:**
- Core Hotspot Management
- User Authentication
- RouterOS Integration
- Basic Reporting

## Supported Versions

- **Current**: 1.2.0 (Full support)
- **LTS**: 1.1.x, 1.2.x (Bug fixes only)
- **Security**: 1.2.0, 1.1.x (Security patches)
- **Deprecated**: 1.0.0 (No support)

## Compatibility

### RouterOS
- v6.x (Full support)
- v7.x (Full support)

### Operating Systems
- Ubuntu 24.04 LTS
- Debian 12
- macOS 12+
- Windows Server 2019+

### Browsers
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Requirements
- Node.js: 18.0.0 - 20.x.x
- npm: 9.0.0+
- MariaDB/MySQL: 5.7 or later

## API Usage Examples

### Get Current Version
```bash
curl http://localhost:3000/api/version

Response:
{
  "success": true,
  "version": "1.2.0",
  "buildNumber": "20260417",
  "releaseDate": "2026-04-17",
  "components": {
    "backend": {
      "version": "1.2.0",
      "framework": "Node.js + Express"
    },
    "frontend": {
      "version": "1.2.0",
      "framework": "React + Vite"
    }
  }
}
```

### Get Version History
```bash
curl http://localhost:3000/api/version/history

Response:
{
  "success": true,
  "version": "1.2.0",
  "history": [
    {
      "version": "1.2.0",
      "date": "2026-04-17",
      "status": "Current",
      "features": ["DHCP Leases", "Ubuntu Suite"],
      "bugFixes": [...]
    },
    ...
  ]
}
```

### Check Health & Version
```bash
curl http://localhost:3000/api/health

Response:
{
  "status": "ok",
  "version": "1.2.0",
  "buildNumber": "20260417",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "host": "localhost",
    "database": "mt_api"
  },
  "nodeVersion": "18.12.0"
}
```

### Check Compatibility
```bash
curl "http://localhost:3000/api/version/compatibility?clientVersion=1.2.0"

Response:
{
  "clientVersion": "1.2.0",
  "supported": true,
  "upgrade_available": false,
  "latest_version": "1.2.0"
}
```

## Frontend Integration

### Using VersionInfo Component

```jsx
import VersionInfo from './components/VersionInfo';

// In your component:
<VersionInfo showFull={false} />  // Compact version badge
<VersionInfo showFull={true} />   // Full version details panel
```

### Features:
- **Compact Mode** (`showFull={false}`): Shows version number and build
- **Full Mode** (`showFull={true}`): Shows detailed info with components
- **History Modal**: Click "View Version History" to see all releases
- **Real-time Fetch**: Automatically fetches latest version from API

## Deployment Considerations

### When Deploying a New Version
1. Update version in `backend/src/version.js`
2. Update build number (use YYYYMMDD format)
3. Add entry to `CHANGELOG.md`
4. Update `package.json` files in both frontend and backend
5. Docker images will automatically pick up the new version
6. Restart containers with new images

### Environment Variables
- No new environment variables required
- Version is embedded in the code
- Build process will automatically use updated versions

## Troubleshooting

### Version Endpoint Returns 500
- Check that `backend/src/version.js` exists and exports correctly
- Verify database connection is working
- Check server logs for detailed error information

### VersionInfo Component Not Displaying
- Ensure VersionInfo.jsx is in `frontend/src/components/`
- Verify API_BASE URL is correctly configured
- Check browser console for network errors
- Confirm `/api/version` endpoint is accessible

### Version Mismatch Between API and UI
- Rebuild frontend: `npm run build`
- Rebuild Docker images: `docker-compose build`
- Restart containers: `docker-compose restart`

## Next Steps

1. **Test the endpoints**:
   ```bash
   curl http://localhost:3000/api/version
   ```

2. **View version in UI**:
   - Open dashboard and check footer
   - Click "History" button to see changelog

3. **Set up monitoring**:
   - Use `/api/health` endpoint in monitoring tools
   - Set up alerts for version changes

4. **Document custom versions**:
   - When creating hotfixes, update version.js with patch version
   - Add entry to CHANGELOG.md immediately

## Support

For issues or questions about the version control system:
1. Check the CHANGELOG.md for release notes
2. Review API endpoints documentation above
3. Check VersionInfo.jsx component source for UI details
4. Verify files exist in correct directories
