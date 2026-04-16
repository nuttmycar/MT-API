# 🎯 Post-Installation Setup Guide

**After deploying MT-API on Ubuntu, follow these steps to complete your setup.**

---

## ✅ Checklist

- [ ] Access the web interface
- [ ] Create admin account
- [ ] Configure MikroTik connection
- [ ] Test MikroTik communication
- [ ] Set up backup schedule
- [ ] Configure alerts (optional)
- [ ] Set user roles and permissions
- [ ] Test the application

---

## 1️⃣ Access Web Interface

Open your browser and go to:

```
http://your-server-ip:8080
```

Or locally:
```
http://localhost:8080
```

---

## 2️⃣ Create Admin Account

### Default Login (if available)
- **Username:** admin
- **Password:** admin123

**⚠️ IMPORTANT:** Change the default password immediately!

### Create New Admin if Needed

If default credentials don't work, check the backend logs:

```bash
docker compose -f docker-compose.prod.yml logs mt-api-backend | grep -i "admin\|seed"
```

---

## 3️⃣ Configure MikroTik Connection

### Step 1: Access Settings

1. Click **⚙️ Settings** in the sidebar
2. Go to **MikroTik Configuration**
3. Fill in your MikroTik router details:

| Field | Description | Example |
|-------|-------------|---------|
| **Host/IP** | MikroTik router IP | 192.168.10.1 |
| **Port** | API port | 8728 (v7) or 8729 (v6) |
| **Username** | MikroTik API user | bbapi |
| **Password** | MikroTik API password | eepower |
| **OS Version** | RouterOS version | v7 or v6 |

### Step 2: Test Connection

Click **🔍 Test Connection**

Expected result:
```
✓ Connected to MikroTik at 192.168.10.1 (Version: 7.x)
```

### Step 3: Troubleshooting Connection Issues

If connection fails:

```bash
# 1. Check MikroTik is accessible
ping 192.168.10.1

# 2. Check API port is open on MikroTik
# On MikroTik console:
/ip service print

# 3. Verify credentials in .env
cat .env | grep MIKROTIK

# 4. Check backend logs
docker compose -f docker-compose.prod.yml logs mt-api-backend | grep -i mikrotik

# 5. Restart backend after fixing credentials
docker compose -f docker-compose.prod.yml restart mt-api-backend
```

---

## 4️⃣ Test Communication

### View MikroTik Dashboard

1. Go to **📊 MikroTik** tab
2. Select tabs to verify data:
   - **System** - Router info, uptime, CPU, RAM
   - **Interfaces** - Active network interfaces
   - **Hotspot Users** - Connected hotspot users
   - **IP Binding** - Static IP bindings
   - **Walled Garden** - Allowed sites
   - **DHCP Leases** - Active DHCP leases
   - **Bandwidth** - Traffic statistics

---

## 5️⃣ Configure Settings

### Database Settings

```
Settings → System → Database
```

- Verify database connection
- Check database size

### Backup Settings

```
Settings → System → Backup & Restore
```

Enable automatic backups:
- Interval: Daily (86400 seconds)
- Retention: 30 days
- Location: `./backups/auto/`

### Alert Settings (Optional)

```
Settings → System → LINE/Telegram Alerts
```

Configure notifications:
1. Choose channels (LINE Notify or Telegram)
2. Enter bot tokens/chat IDs
3. Set alert thresholds
4. Test with "Send Test Alert"

---

## 6️⃣ Set User Roles & Permissions

### Manage Users

```
Users Management
```

Common roles:
- **admin** - Full access
- **operator** - View & manage hotspot users
- **viewer** - Read-only access
- **technician** - Manage IP bindings & walled garden

### Configure Role Permissions

```
Access Control Manager
```

- Set menu visibility per role
- Configure action-level permissions
- View login history

---

## 7️⃣ Initial Tests

### Test Hotspot Management

If you have MikroTik hotspot configured:

1. Go to **👥 Users** → **Hotspot Users**
2. You should see connected users
3. Try to disable/enable a user (if permitted)

### Test IP Binding CRUD

```
MikroTik → IP Binding → Add New
```

Add a test IP binding (or check existing ones)

### Test Walled Garden

```
MikroTik → Walled Garden → Add New
```

Add a test walled garden rule

### View Reports

```
📊 Reports → Dashboard
```

Check for:
- Approval stats
- Trend analytics
- Login history

---

## 🔒 Security Hardening

### Change Default Credentials

```
Settings → Access Control → Users
```

1. Change admin password
2. Delete default users
3. Create new admin users

### Database Security

**Change database password:**

Edit `.env`:
```bash
# Generate new secure password
openssl rand -base64 32

# Update .env
nano .env
# Change: DB_PASS=new_secure_password
```

Restart database:
```bash
docker compose -f docker-compose.prod.yml restart mt-api-db
```

### JWT Secret

Generate a strong JWT secret:

```bash
openssl rand -hex 32
```

Update `.env`:
```bash
JWT_SECRET=your_generated_secret_here
```

Restart backend:
```bash
docker compose -f docker-compose.prod.yml restart mt-api-backend
```

### Enable Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 8080/tcp      # Frontend
sudo ufw allow 3000/tcp      # Backend (optional)

# Optionally allow database only from localhost
# If accessing from remote, allow with caution
sudo ufw allow from 192.168.x.0/24 to any port 3307
```

---

## 📊 Monitoring & Maintenance

### Monitor Container Health

```bash
# Run health check script
bash health-check.sh

# Or manually
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats
```

### Check Logs Regularly

```bash
# Last 50 lines
docker compose -f docker-compose.prod.yml logs --tail=50

# Real-time monitoring
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f mt-api-backend
```

### Verify Backups

```bash
# Check backup directory
ls -lah backups/auto/

# List recent backups
ls -lht backups/auto/ | head -5

# Test restore (on staging first!)
# Never restore to production without testing
```

---

## 🔄 Regular Maintenance

### Daily
- Check system is running: `docker ps`
- Monitor errors: `docker compose logs --tail=20`

### Weekly
- Review backups created
- Check disk space: `df -h`
- View login history and changes

### Monthly
- Update system packages: `sudo apt update && apt upgrade -y`
- Rebuild Docker images: `docker compose up -d --build`
- Test backup restore procedure

### Quarterly
- Review and update security settings
- Audit user permissions and access
- Performance optimization review

---

## 📞 Useful Commands

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# Access database
docker compose -f docker-compose.prod.yml exec mt-api-db mysql -u mt_user -p mt_api

# Backup database
docker compose -f docker-compose.prod.yml exec mt-api-db mysqldump -u mt_user -p mt_api > backup_$(date +%Y%m%d_%H%M%S).sql

# View container resource usage
docker stats

# Restart specific service
docker compose -f docker-compose.prod.yml restart mt-api-backend

# View running processes
docker compose -f docker-compose.prod.yml top mt-api-backend
```

---

## ❓ FAQ

### Q: How do I reset the admin password?

A: Access the database and update the user table:
```bash
docker compose -f docker-compose.prod.yml exec mt-api-db mysql -u mt_user -p mt_api
# Then in MySQL: UPDATE users SET password='hash' WHERE username='admin';
```

### Q: How do I move backups to external storage?

A: Modify the backup path in `.env`:
```bash
BACKUP_PATH=/mnt/external-storage/backups
```

### Q: Can I use HTTPS/SSL?

A: Yes! Configure Nginx SSL in `frontend/nginx.conf` or use a reverse proxy like Let's Encrypt with Certbot.

### Q: How do I update the application?

A: Pull latest code and rebuild:
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Q: How do I enable MikroTik API on my router?

A: On your MikroTik router:
```
/ip service enable api
/ip service enable api-ssl
```

Then create an API user:
```
/user add name=bbapi password=eepower group=full
```

---

## 🎉 You're All Set!

Your MT-API installation is now fully configured and ready for production use!

**Next steps:**
1. Monitor the system regularly
2. Set up automated backups
3. Configure monitoring/alerts
4. Train users on the system
5. Plan for scaling as needed

**Happy monitoring! 🚀**
