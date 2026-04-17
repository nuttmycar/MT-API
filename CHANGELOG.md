# 🔖 Version 1.2.0 (April 17, 2026)

## ✨ New Features
- **DHCP Server Leases Management** - New tab in MikroTik dashboard
  - Real-time DHCP lease viewing with search/filter
  - Support for RouterOS v6 and v7
  - Lease status tracking (bound, waiting, blocked, disabled)
  - Dynamic vs Static lease differentiation

- **Ubuntu 24.04 LTS Deployment Suite**
  - Automated setup script (`setup-ubuntu.sh`)
  - Comprehensive deployment documentation
  - Health check and monitoring tools
  - Post-installation configuration guide
  - Docker Compose Ubuntu optimizations

## 🔧 Improvements
- Enhanced MikroTik integration with better error handling
- Improved DHCP lease API performance
- Better frontend filtering interface
- Ubuntu-optimized Docker configuration

## 🐛 Bug Fixes
- Fixed DHCP lease data mapping for multiple RouterOS versions
- Improved API response consistency

## 📚 Documentation
- Added UBUNTU_SETUP_GUIDE.md
- Added POST_INSTALLATION_GUIDE.md
- Added quick reference scripts

---

# 🔖 Version 1.1.0 (April 16, 2026)

## ✨ New Features
- **Smart Analytics & Alerts**
  - Trend analytics with approval rate tracking
  - Daily average calculations and peak day analysis
  - Previous period comparisons
  - Top departments tracking

- **LINE/Telegram Alert Integration**
  - Real-time notifications for critical events
  - Configurable alert thresholds
  - Multi-channel support
  - Test alert functionality

- **Action-Level Permissions**
  - Fine-grained menu item permissions
  - Action-specific access control
  - User-specific function restrictions

- **Login History & Audit Logs**
  - Complete login tracking (success/failure)
  - IP address and user agent logging
  - Audit trail for all actions

## 🔧 Improvements
- Enhanced access control system
- Better role-based UI rendering
- Improved navbar/menu visibility
- More comprehensive audit logging

## 🐛 Bug Fixes
- Fixed permission checking in protected routes
- Improved error messages for access denied scenarios

---

# 🔖 Version 1.0.0 (April 15, 2026)

## 🎉 Initial Release

### Core Features
- **MikroTik Hotspot Management**
  - User approval workflow
  - Integration with MikroTik RouterOS
  - Real-time user status tracking

- **Dashboard**
  - System status overview
  - MikroTik metrics and monitoring
  - User management interface
  - Reports and statistics

- **User Management**
  - User registration requests
  - Approval workflow
  - User profile management
  - Batch import functionality

- **Access Control**
  - Role-based access control (RBAC)
  - Section-level permissions
  - User role assignment
  - Dashboard permission management

- **MikroTik Integration**
  - IP Binding management
  - Walled Garden rules
  - Bandwidth monitoring
  - Hotspot user management
  - Interface monitoring

- **Advanced Features**
  - Automatic backups
  - Auto-restore functionality
  - System notifications
  - Audit logging
  - QR code generation
  - Coupon management

- **Settings**
  - Application branding
  - MikroTik configuration
  - Database configuration
  - Backup scheduling
  - Notification settings

### Architecture
- **Backend:** Node.js + Express
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** MariaDB/MySQL
- **Authentication:** JWT tokens
- **Deployment:** Docker + Docker Compose

### Supported Platforms
- RouterOS v7 (REST API)
- RouterOS v6 (RouterOS API)
- Windows / Linux / macOS

### Documentation
- Setup guides
- API documentation
- Troubleshooting guides
- Deployment instructions

---

## 📋 Version History

| Version | Date | Status | Key Changes |
|---------|------|--------|------------|
| 1.2.0 | April 17, 2026 | Current | DHCP Leases + Ubuntu Suite |
| 1.1.0 | April 16, 2026 | Stable | Smart Analytics + Alerts + Permissions |
| 1.0.0 | April 15, 2026 | Released | Initial Release |

---

## 🔄 Release Cycle

- **Major (X.0.0):** Large feature additions, breaking changes
- **Minor (1.X.0):** New features, backward compatible
- **Patch (1.0.X):** Bug fixes, security patches

## 📅 Update Schedule

- Regular security updates: Monthly
- Feature releases: Every 2-4 weeks
- Critical patches: As needed
- Long-term support: 12+ months per major version

---

## 🙏 Contributors

- Development Team
- QA Team
- Community Feedback

## 📞 Support

For issues and bug reports, please visit:
https://github.com/nuttmycar/MT-API/issues

## 📜 License

See LICENSE file for details

---

**Generated:** April 17, 2026  
**Last Updated:** v1.2.0  
**Next Review:** May 2026
