#!/usr/bin/env bash

################################################################################
# MT-API Ubuntu Quick Reference Card
# Print this for quick command lookup
################################################################################

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                 MT-API UBUNTU QUICK REFERENCE CARD                        ║
║                    Ubuntu 24.04 LTS Deployment                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📚 DOCUMENTATION
══════════════════════════════════════════════════════════════════════════════
  First time?                → Read UBUNTU_SETUP_GUIDE.md
  Ready to deploy?           → Run ./setup-ubuntu.sh
  Setup complete?            → Read POST_INSTALLATION_GUIDE.md
  Troubleshooting?           → Check UBUNTU_SETUP_GUIDE.md - Common Issues
  System health?             → Run bash health-check.sh

🚀 QUICK START (AUTOMATED)
══════════════════════════════════════════════════════════════════════════════
  $ cd MT-API
  $ chmod +x setup-ubuntu.sh
  $ ./setup-ubuntu.sh

🚀 QUICK START (MANUAL)
══════════════════════════════════════════════════════════════════════════════
  $ sudo apt update && sudo apt install -y docker.io docker-compose
  $ sudo usermod -aG docker $USER
  $ newgrp docker
  $ cp .env.example .env
  $ nano .env                           # Edit MikroTik settings
  $ docker compose -f docker-compose.prod.yml up -d --build
  $ bash health-check.sh                # Verify

🌐 ACCESS
══════════════════════════════════════════════════════════════════════════════
  Frontend:  http://localhost:8080     (or your-server-ip:8080)
  Backend:   http://localhost:3000/api
  Database:  localhost:3307

📦 CONTAINER MANAGEMENT
══════════════════════════════════════════════════════════════════════════════
  View containers:           docker compose -f docker-compose.prod.yml ps
  Start containers:          docker compose -f docker-compose.prod.yml up -d
  Stop containers:           docker compose -f docker-compose.prod.yml down
  Restart all:               docker compose -f docker-compose.prod.yml restart
  Rebuild images:            docker compose -f docker-compose.prod.yml up -d --build

📋 LOGS & DEBUGGING
══════════════════════════════════════════════════════════════════════════════
  View all logs:             docker compose -f docker-compose.prod.yml logs
  Follow logs:               docker compose -f docker-compose.prod.yml logs -f
  Backend logs:              docker compose -f docker-compose.prod.yml logs -f mt-api-backend
  Frontend logs:             docker compose -f docker-compose.prod.yml logs -f mt-api-frontend
  Database logs:             docker compose -f docker-compose.prod.yml logs -f mt-api-db
  Last 50 lines:             docker compose -f docker-compose.prod.yml logs --tail=50

🔍 SYSTEM INFORMATION
══════════════════════════════════════════════════════════════════════════════
  Ubuntu version:            lsb_release -a
  Docker version:            docker --version
  Compose version:           docker compose version
  Disk usage:                df -h
  Memory usage:              free -h
  Running processes:         docker stats
  Which service uses port X: sudo lsof -i :8080

🔧 CONFIGURATION
══════════════════════════════════════════════════════════════════════════════
  Edit environment:          nano .env
  View environment:          cat .env
  Backup environment:        cp .env .env.backup
  Edit MikroTik settings:    # Update these in .env:
                             # MIKROTIK_HOST=192.168.x.x
                             # MIKROTIK_USER=xxx
                             # MIKROTIK_PASS=xxx

💾 DATABASE ACCESS
══════════════════════════════════════════════════════════════════════════════
  Access MySQL:              docker compose -f docker-compose.prod.yml exec mt-api-db mysql -u mt_user -p mt_api
  Backup database:           docker compose -f docker-compose.prod.yml exec mt-api-db mysqldump -u mt_user -p mt_api > backup.sql
  Restore database:          cat backup.sql | docker compose -f docker-compose.prod.yml exec -T mt-api-db mysql -u mt_user -p mt_api

🔗 VERIFY CONNECTIVITY
══════════════════════════════════════════════════════════════════════════════
  API health:                curl http://localhost:8080/api/health
  Database:                  docker compose -f docker-compose.prod.yml exec mt-api-db mysqladmin ping -h localhost
  MikroTik ping:             ping 192.168.10.1
  Docker daemon:             docker ps

🚨 TROUBLESHOOTING
══════════════════════════════════════════════════════════════════════════════
  Port already in use:       sudo netstat -tlnp | grep :8080
  Docker daemon not running: sudo systemctl start docker
  Permission denied:         sudo usermod -aG docker $USER && newgrp docker
  Container won't start:     docker compose -f docker-compose.prod.yml logs -f service_name
  Database connection fail:  docker compose -f docker-compose.prod.yml logs mt-api-db

🔐 SECURITY
══════════════════════════════════════════════════════════════════════════════
  Firewall status:           sudo ufw status
  Enable firewall:           sudo ufw enable
  Allow port 8080:           sudo ufw allow 8080/tcp
  Allow port 3000:           sudo ufw allow 3000/tcp
  Generate JWT secret:       openssl rand -hex 32
  Generate db password:      openssl rand -base64 32

🔄 UPDATES & MAINTENANCE
══════════════════════════════════════════════════════════════════════════════
  Update Ubuntu packages:    sudo apt update && sudo apt upgrade -y
  Rebuild containers:        docker compose -f docker-compose.prod.yml up -d --build
  Clear Docker cache:        docker system prune -a
  View resource usage:       docker stats

📊 HEALTH CHECK
══════════════════════════════════════════════════════════════════════════════
  Full health check:         bash health-check.sh
  Container status:          docker compose -f docker-compose.prod.yml ps
  Docker info:               docker info
  System resources:          free -h && df -h

⚡ PERFORMANCE TIPS
══════════════════════════════════════════════════════════════════════════════
  Use Ubuntu override:       docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d
  Monitor resources:         watch -n 1 'docker stats'
  Check connection limits:   cat /proc/sys/fs/file-max

📞 GETTING HELP
══════════════════════════════════════════════════════════════════════════════
  View setup guide:          less UBUNTU_SETUP_GUIDE.md
  View post-install guide:   less POST_INSTALLATION_GUIDE.md
  View this card:            bash quick-reference.sh
  Check health:              bash health-check.sh

═════════════════════════════════════════════════════════════════════════════

⏱️  COMMON WORKFLOWS

  [1] Initial Setup
  ─────────────────
      chmod +x setup-ubuntu.sh
      ./setup-ubuntu.sh
      # Follow prompts

  [2] Daily Health Check
  ─────────────────────
      bash health-check.sh
      docker compose -f docker-compose.prod.yml ps

  [3] View Recent Logs
  ────────────────────
      docker compose -f docker-compose.prod.yml logs --tail=100 -f

  [4] Restart Application
  ───────────────────────
      docker compose -f docker-compose.prod.yml restart
      sleep 5
      bash health-check.sh

  [5] Backup Database
  ───────────────────
      docker compose -f docker-compose.prod.yml exec mt-api-db mysqldump -u mt_user -p mt_api > backup_$(date +%Y%m%d_%H%M%S).sql
      ls -lah backup_*.sql

  [6] Troubleshoot Connection
  ────────────────────────────
      # Check if API responding
      curl -v http://localhost:8080/api/health
      
      # View error logs
      docker compose -f docker-compose.prod.yml logs mt-api-backend | grep -i error
      
      # Check database connectivity
      docker compose -f docker-compose.prod.yml exec mt-api-db mysql -u mt_user -p mt_api -e "SELECT 1;"

═════════════════════════════════════════════════════════════════════════════

💡 TIPS & TRICKS

  • Use 'alias' to shorten commands:
    alias mtapi='docker compose -f docker-compose.prod.yml'
    mtapi ps

  • Create systemd service for auto-start:
    # See POST_INSTALLATION_GUIDE.md for details

  • Monitor in real-time:
    watch -n 1 'docker compose -f docker-compose.prod.yml ps'

  • Quick status check:
    echo "==Docker=="; docker ps -q | wc -l; echo "==API=="; curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8080/api/health

═════════════════════════════════════════════════════════════════════════════

📁 KEY FILES

  .env                    - Environment configuration (CREATE & CUSTOMIZE)
  .env.example            - Template for .env
  setup-ubuntu.sh         - Automated setup script
  health-check.sh         - Health verification script
  docker-compose.prod.yml - Main compose configuration
  UBUNTU_SETUP_GUIDE.md   - Complete setup documentation
  POST_INSTALLATION_GUIDE.md - Configuration after setup

═════════════════════════════════════════════════════════════════════════════

🎯 FIRST 5 MINUTES CHECKLIST

  [ ] cd MT-API
  [ ] chmod +x setup-ubuntu.sh
  [ ] ./setup-ubuntu.sh
  [ ] Wait for completion (~5 mins)
  [ ] bash health-check.sh
  [ ] Open http://localhost:8080

═════════════════════════════════════════════════════════════════════════════

Version: April 2026 | Compatible: Ubuntu 24.04 LTS | Last Updated: Ready

═════════════════════════════════════════════════════════════════════════════
EOF
