# 📦 Ubuntu Setup Files - Summary

This directory now contains comprehensive Ubuntu deployment setup files.

---

## 📋 Files Created

### 1. `.env.example` ✨ NEW
**Template for environment configuration**

- Contains all environment variables needed
- Well-documented with descriptions
- Copy and customize for your deployment
- **Use:** `cp .env.example .env && nano .env`

### 2. `setup-ubuntu.sh` ✨ NEW
**Automated Ubuntu installation script**

- Installs Docker and Docker Compose
- Configures system permissions
- Sets up firewalls (UFW)
- Prompts for MikroTik credentials
- Builds and starts containers
- Runs health checks
- **Use:** `chmod +x setup-ubuntu.sh && ./setup-ubuntu.sh`

### 3. `UBUNTU_SETUP_GUIDE.md` ✨ NEW
**Comprehensive Ubuntu deployment guide**

- Complete step-by-step instructions
- Manual installation option
- Troubleshooting common issues
- Useful commands reference
- Maintenance procedures
- **Read before deployment**

### 4. `health-check.sh` ✨ NEW
**System health verification script**

- Checks Docker status
- Verifies containers running
- Tests API health
- Checks port availability
- Reviews disk and memory
- **Use:** `bash health-check.sh`

### 5. `docker-compose.ubuntu.yml` ✨ NEW
**Ubuntu-specific Docker Compose overrides**

- Resource limits for Ubuntu environment
- Performance tuning
- Linux-specific security options
- **Use:** `docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d`

### 6. `POST_INSTALLATION_GUIDE.md` ✨ NEW
**Post-deployment configuration guide**

- Initial web interface access
- Creating admin accounts
- MikroTik connection setup
- Security hardening
- Regular maintenance tasks
- **Read after successful deployment**

---

## 🚀 Quick Start on Ubuntu

### Option 1: Automated (Recommended)

```bash
# 1. Clone repo
git clone https://github.com/nuttmycar/MT-API.git
cd MT-API

# 2. Run setup script
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh

# Follow interactive prompts during setup
```

### Option 2: Manual Installation

```bash
# 1. Clone repo
git clone https://github.com/nuttmycar/MT-API.git
cd MT-API

# 2. Follow UBUNTU_SETUP_GUIDE.md step-by-step
cat UBUNTU_SETUP_GUIDE.md

# 3. After setup, follow POST_INSTALLATION_GUIDE.md
cat POST_INSTALLATION_GUIDE.md
```

---

## 📁 File Directory Structure

```
MT-API/
├── .env.example                    # ✨ NEW - Environment template
├── setup-ubuntu.sh                 # ✨ NEW - Installation script
├── health-check.sh                 # ✨ NEW - Health check script
├── docker-compose.prod.yml         # Existing production config
├── docker-compose.ubuntu.yml       # ✨ NEW - Ubuntu optimizations
├── UBUNTU_SETUP_GUIDE.md          # ✨ NEW - Setup documentation
├── POST_INSTALLATION_GUIDE.md     # ✨ NEW - Post-setup guide
├── backend/                        # Existing backend code
├── frontend/                       # Existing frontend code
└── docs/                          # Existing documentation
```

---

## 🎯 Recommended Reading Order

1. **First time?** → Read `UBUNTU_SETUP_GUIDE.md`
2. **Ready to deploy?** → Run `setup-ubuntu.sh`
3. **Setup complete?** → Follow `POST_INSTALLATION_GUIDE.md`
4. **Troubleshooting?** → Check `UBUNTU_SETUP_GUIDE.md` FAQ section
5. **Health check?** → Run `health-check.sh`

---

## 📋 Environment Variables

Key variables in `.env.example`:

```bash
# Database
DB_HOST=mt-api-db
DB_USER=mt_user
DB_PASS=secure_password_change_this

# MikroTik Connection
MIKROTIK_HOST=192.168.10.1
MIKROTIK_USER=bbapi
MIKROTIK_PASS=eepower

# Application
APP_PORT=8080
NODE_ENV=production
```

**⚠️ Always customize these values!**

---

## 🔧 Common Commands on Ubuntu

```bash
# Check if running
bash health-check.sh

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Start/Stop
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build

# Access web interface
# http://localhost:8080
```

---

## 📊 Setup Script Features

The `setup-ubuntu.sh` automatically:

- ✅ Detects Ubuntu/Debian OS
- ✅ Updates system packages
- ✅ Installs Docker & Docker Compose
- ✅ Configures Docker permissions
- ✅ Checks port availability
- ✅ Sets up UFW firewall
- ✅ Creates required directories
- ✅ Prompts for configuration
- ✅ Builds Docker images
- ✅ Starts containers
- ✅ Waits for services
- ✅ Runs health checks
- ✅ Displays success information

---

## ⚠️ Pre-Requisites

Before running setup script, have ready:

- [ ] Ubuntu 24.04 LTS or similar
- [ ] sudo/root access
- [ ] 2GB+ RAM
- [ ] 10GB disk space
- [ ] MikroTik router IP address
- [ ] MikroTik API credentials
- [ ] Network connectivity

---

## 🔍 Verification Steps

After setup:

```bash
# 1. Check containers
docker ps

# 2. Test API
curl http://localhost:8080/api/health

# 3. Check frontend
# Open http://localhost:8080 in browser

# 4. Verify database
docker compose -f docker-compose.prod.yml exec mt-api-db mysql ping

# 5. Run full health check
bash health-check.sh
```

---

## 📚 Documentation Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `.env.example` | Configuration template | Before first setup |
| `UBUNTU_SETUP_GUIDE.md` | Installation guide | Before deployment |
| `setup-ubuntu.sh` | Automated setup | During deployment |
| `health-check.sh` | System verification | After deployment |
| `docker-compose.ubuntu.yml` | Ubuntu optimizations | Optional, advanced users |
| `POST_INSTALLATION_GUIDE.md` | Initial configuration | After successful deployment |

---

## 🎓 Learning Path

### Beginner
1. Read `UBUNTU_SETUP_GUIDE.md` - Quick Start section
2. Run `setup-ubuntu.sh`
3. Follow `POST_INSTALLATION_GUIDE.md`

### Intermediate
1. Study `UBUNTU_SETUP_GUIDE.md` - Full guide
2. Understand `docker-compose.prod.yml` structure
3. Configure `.env` manually
4. Run containers with `docker compose`

### Advanced
1. Study all documentation
2. Use Ubuntu profile override: `docker-compose.ubuntu.yml`
3. Configure monitoring and backups
4. Set up SSL/HTTPS
5. Plan scaling strategy

---

## 🆘 Need Help?

1. **Installation issues?** → Check `UBUNTU_SETUP_GUIDE.md` - Common Issues
2. **Post-setup questions?** → Read `POST_INSTALLATION_GUIDE.md`
3. **Health concerns?** → Run `health-check.sh`
4. **View logs:** 
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

---

## ✅ Success Indicators

Your setup is complete when:

- [ ] `setup-ubuntu.sh` completes without errors
- [ ] `docker ps` shows 3 running containers
- [ ] `curl http://localhost:8080/api/health` returns `{"status":"ok"}`
- [ ] Browser shows frontend at `http://localhost:8080`
- [ ] `bash health-check.sh` shows all green checks

---

## 📝 Next Steps After Setup

1. Access web interface: `http://localhost:8080`
2. Create admin account
3. Configure MikroTik connection
4. Test MikroTik communication
5. Set up backup schedule
6. Configure user roles and permissions
7. Enable alerts (optional)

**See `POST_INSTALLATION_GUIDE.md` for detailed post-setup steps.**

---

## 🎉 Congratulations!

You now have a complete, documented Ubuntu deployment setup for MT-API!

**Questions?** Refer to the relevant documentation file above.

**Ready?** Run: `./setup-ubuntu.sh`

**Happy deploying! 🚀**

---

**Last Updated:** April 2026  
**Compatible:** Ubuntu 24.04 LTS and similar Debian-based systems
