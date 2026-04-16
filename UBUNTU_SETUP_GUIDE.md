# 🚀 MT-API Ubuntu Installation Guide

**Tested on:** Ubuntu 24.04.4 LTS  
**Last Updated:** April 2026

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Manual Installation](#manual-installation)
4. [Using Setup Script](#using-setup-script)
5. [Configuration](#configuration)
6. [Common Issues](#common-issues)
7. [Maintenance](#maintenance)

---

## ⚡ Quick Start

```bash
# 1. Clone the repository
cd ~
git clone https://github.com/nuttmycar/MT-API.git
cd MT-API

# 2. Make script executable
chmod +x setup-ubuntu.sh

# 3. Run setup script
./setup-ubuntu.sh

# 4. Open browser
# http://localhost:8080
```

**That's it!** The script will handle everything else.

---

## 📦 Prerequisites

### System Requirements
- **OS:** Ubuntu 24.04 LTS (or similar Debian-based)
- **RAM:** Minimum 2GB (4GB+ recommended)
- **Disk:** 10GB free space
- **CPU:** 2+ cores
- **Network:** Access to your MikroTik router

### Required Tools (installed by script)
- Docker 20.10+
- Docker Compose 2.0+ (or `docker-compose` 1.29+)
- Git (for cloning repo)
- curl (for health checks)

### Network Ports
- **8080** - Frontend (Nginx)
- **3000** - Backend API (Node.js)
- **3307** - Database (MariaDB)

---

## 🛠️ Manual Installation

### Step 1: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 2: Install Docker

```bash
# Install Docker
sudo apt install -y docker.io
sudo apt install -y docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 3: Add User to Docker Group

```bash
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

### Step 4: Clone Repository

```bash
cd ~
git clone https://github.com/nuttmycar/MT-API.git
cd MT-API
```

### Step 5: Setup Environment

```bash
# Copy template
cp .env.example .env

# Edit configuration
nano .env
```

**Critical variables to set:**
- `MIKROTIK_HOST` - Your MikroTik router IP
- `MIKROTIK_USER` - MikroTik username
- `MIKROTIK_PASS` - MikroTik password
- `DB_PASS` - Database password (change from default)
- `JWT_SECRET` - Generate a secure random string

### Step 6: Create Directories

```bash
mkdir -p backups/auto logs data
chmod 755 backups/auto logs data
```

### Step 7: Build and Start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 8: Verify

```bash
# Check containers
docker compose -f docker-compose.prod.yml ps

# Test API
curl http://localhost:8080/api/health

# Open browser
# http://localhost:8080
```

---

## 📝 Using Setup Script

### Basic Usage

```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

### What the Script Does

1. ✅ Checks OS compatibility
2. ✅ Updates system packages
3. ✅ Installs Docker & Docker Compose
4. ✅ Configures Docker permissions
5. ✅ Checks port availability
6. ✅ Sets up firewall rules (UFW)
7. ✅ Creates necessary directories
8. ✅ Prompts for MikroTik & DB credentials
9. ✅ Builds Docker images
10. ✅ Starts containers
11. ✅ Runs health checks
12. ✅ Displays access URLs

### Interactive Configuration

The script will prompt you for:

```
Enter MikroTik Host: 192.168.10.1
Enter MikroTik Username: bbapi
Enter MikroTik Password: ••••••••
Enter Database Password: ••••••••
```

---

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Database
DB_HOST=mt-api-db
DB_PORT=3306
DB_NAME=mt_api
DB_USER=mt_user
DB_PASS=CHANGE_THIS_SECURE_PASSWORD

# Application
NODE_ENV=production
APP_PORT=8080

# MikroTik Connection
MIKROTIK_HOST=192.168.10.1
MIKROTIK_PORT=8728
MIKROTIK_USER=bbapi
MIKROTIK_PASS=eepower
MIKROTIK_OS_VERSION=v7  # or v6

# JWT Security
JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRE=7d

# Backup
AUTO_BACKUP_ENABLED=true
AUTO_BACKUP_INTERVAL=86400
BACKUP_RETENTION_DAYS=30
```

### Docker Compose Customization

Edit `docker-compose.prod.yml` to adjust:

```yaml
# Change port mapping
ports:
  - "8080:80"      # Frontend
  - "3000:3000"    # Backend
  - "3307:3306"    # Database

# Change volume paths (use absolute paths)
volumes:
  - /home/user/MT-API/backups:/app/backups
  - /home/user/MT-API/logs:/app/logs
```

---

## ❌ Common Issues

### Issue 1: Permission Denied Running Docker

**Error:** `permission denied while trying to connect to Docker daemon`

**Solution:**
```bash
sudo usermod -aG docker $USER
newgrp docker
# Then log out and back in
```

### Issue 2: Port Already in Use

**Error:** `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Solution:**
```bash
# Check what's using the port
sudo netstat -tlnp | grep :8080

# Option A: Stop the conflicting service
sudo systemctl stop apache2  # or nginx, etc.

# Option B: Change port in docker-compose.prod.yml
# ports:
#   - "8081:80"  # Use 8081 instead
```

### Issue 3: Database Connection Failed

**Error:** `Can't connect to MySQL server on 'mt-api-db'`

**Solution:**
```bash
# Wait a moment for DB to start
sleep 10
docker compose -f docker-compose.prod.yml logs mt-api-db

# Check if DB service is running
docker compose -f docker-compose.prod.yml ps mt-api-db

# Restart database
docker compose -f docker-compose.prod.yml restart mt-api-db
```

### Issue 4: Frontend Shows "Cannot GET /"

**Solution:**
```bash
# Check if build succeeded
docker compose -f docker-compose.prod.yml logs mt-api-frontend

# Rebuild frontend
docker compose -f docker-compose.prod.yml up -d --build mt-api-frontend
```

### Issue 5: MikroTik Connection Fails

**Error:** `Failed to connect to MikroTik`

**Solution:**
```bash
# 1. Verify credentials in .env
cat .env | grep MIKROTIK

# 2. Test connection from host
ping 192.168.10.1

# 3. Check firewall on MikroTik
# IP > Firewall > Filter Rules (allow API port)

# 4. Restart backend after fixing .env
docker compose -f docker-compose.prod.yml restart mt-api-backend
```

---

## 📊 Useful Commands

### Container Management

```bash
# View all containers
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f mt-api-backend
docker compose -f docker-compose.prod.yml logs -f mt-api-frontend
docker compose -f docker-compose.prod.yml logs -f mt-api-db

# Start containers
docker compose -f docker-compose.prod.yml up -d

# Stop containers
docker compose -f docker-compose.prod.yml down

# Restart specific service
docker compose -f docker-compose.prod.yml restart mt-api-backend

# Execute command in container
docker compose -f docker-compose.prod.yml exec mt-api-backend npm run migrate
```

### Database Access

```bash
# Access database directly
docker compose -f docker-compose.prod.yml exec mt-api-db mysql -u mt_user -p mt_api

# Backup database
docker compose -f docker-compose.prod.yml exec mt-api-db mysqldump -u mt_user -p mt_api > backup.sql

# Restore database
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T mt-api-db mysql -u mt_user -p mt_api
```

### System Health

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Monitor Docker resources
docker stats

# Check port usage
sudo netstat -tlnp | grep LISTEN
```

---

## 🔧 Maintenance

### Regular Tasks

#### Daily
```bash
# Check containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=50
```

#### Weekly
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check disk space
df -h
```

#### Monthly
```bash
# Clean up unused Docker resources
docker system prune

# Verify backups
ls -lah backups/auto/

# Test restore procedure
# (Restore a backup to verify it works)
```

### Backup & Restore

```bash
# Backup (automatic via app, but manual here)
docker compose -f docker-compose.prod.yml exec mt-api-db mysqldump -u mt_user -p mt_api > manual_backup_$(date +%Y%m%d).sql

# Restore
cat manual_backup_20260416.sql | docker compose -f docker-compose.prod.yml exec -T mt-api-db mysql -u mt_user -p mt_api
```

### Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Check migrations
docker compose -f docker-compose.prod.yml logs mt-api-backend | grep migration
```

---

## 🔍 Health Check Scripts

Create a monitoring script at `~/check-mtapi.sh`:

```bash
#!/bin/bash

echo "MT-API Health Check"
echo "==================="

# Check containers
echo "📦 Container Status:"
docker compose -f ~/MT-API/docker-compose.prod.yml ps

# Check API
echo ""
echo "🌐 API Health:"
curl -s http://localhost:8080/api/health || echo "❌ API Unavailable"

# Check disk
echo ""
echo "💾 Disk Usage:"
df -h | grep -E "^/dev"

# Check memory
echo ""
echo "🧠 Memory Usage:"
free -h | grep Mem

echo ""
echo "✅ Check complete"
```

Then:
```bash
chmod +x ~/check-mtapi.sh
./check-mtapi.sh

# Or run periodically with cron
crontab -e
# Add: 0 6 * * * /home/user/check-mtapi.sh >> /home/user/mtapi-health.log
```

---

## 📞 Support & Troubleshooting

### Check Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f mt-api-backend
```

### Get System Info

```bash
# Ubuntu version
lsb_release -a

# Docker version
docker --version
docker compose version

# Running processes using port 8080
sudo lsof -i :8080

# Network interfaces
ip addr show
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [MariaDB Docker](https://hub.docker.com/_/mariadb)
- [Node.js Docker](https://hub.docker.com/_/node)
- [Nginx Docker](https://hub.docker.com/_/nginx)

---

## ✅ Success Checklist

After setup, verify:

- [ ] Docker containers running: `docker ps`
- [ ] API responding: `curl http://localhost:8080/api/health`
- [ ] Frontend accessible: `http://localhost:8080`
- [ ] Database connected: Backend logs show no DB errors
- [ ] MikroTik connected: Settings page shows MikroTik connection
- [ ] Backups directory exists: `ls backups/auto/`
- [ ] Environment file configured: `cat .env`
- [ ] Firewall rules updated: `sudo ufw status`
- [ ] Auto-start enabled: Containers restart after reboot
- [ ] Monitoring setup: Health check script configured

---

## 🎉 Congratulations!

Your MT-API installation is complete and ready for production use on Ubuntu 24.04 LTS!

For questions or issues, refer to the troubleshooting section or check the application logs.

**Happy monitoring! 🚀**
