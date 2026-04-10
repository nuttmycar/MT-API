# Server Deployment Guide for `MT-API`

คู่มือฉบับละเอียดสำหรับนำโปรเจกต์ `MT-API` ไปใช้งานบน **Server จริง** โดยเน้น **Ubuntu + Docker** เป็นหลัก และมีแนวทาง `PM2 + Nginx` ให้เป็นทางเลือก

---

## 1) Deployment Overview

โปรเจกต์นี้ประกอบด้วย:

- `backend/` = Node.js + Express API
- `frontend/` = React + Vite
- `MariaDB` = ฐานข้อมูล
- `MikroTik` = ระบบภายนอกที่ backend ใช้เชื่อมต่อ

### แนวทางที่แนะนำ

**Recommended:** `Docker Compose`
- ติดตั้งง่าย
- ย้ายเครื่องสะดวก
- ดูแล service ง่าย
- เหมาะกับ production ขนาดเล็กถึงกลาง

### โครงสร้างตอน deploy

```text
Internet / Users
       |
   Nginx / Domain / HTTPS   (optional)
       |
   MT-API Frontend Container
       |
      /api
       |
   MT-API Backend Container
       |
    MariaDB Container
       |
    MikroTik Router
```

---

## 2) Recommended Server Spec

สำหรับการใช้งานทั่วไป:

- CPU: `2 vCPU` ขึ้นไป
- RAM: `4 GB` ขึ้นไป
- Disk: `20 GB` ขึ้นไป
- OS: `Ubuntu 22.04 LTS` หรือ `Ubuntu 24.04 LTS`

ถ้ามี user ใช้งานจำนวนมากหรือเก็บ report/backups มาก แนะนำเพิ่ม RAM และ disk

---

## 3) ก่อนเริ่ม Deploy

ควรเตรียมข้อมูลเหล่านี้ให้พร้อม:

- ชื่อ domain หรือ IP ของ server
- Username/Password ของ MariaDB ที่จะใช้จริง
- ค่า `JWT_SECRET` ใหม่ที่ปลอดภัย
- บัญชี admin ของระบบ
- ค่า MikroTik จริง:
  - `MIKROTIK_HOST`
  - `MIKROTIK_PORT`
  - `MIKROTIK_USER`
  - `MIKROTIK_PASS`
  - `MIKROTIK_OS_VERSION`

> ไม่ควรใช้รหัสผ่านตัวอย่างเดิม เช่น `admin123`, `eepower`, หรือ secret เดาง่ายใน production

---

## 4) วิธีที่ 1: Deploy ด้วย Docker Compose (แนะนำ)

### 4.1 ติดตั้ง Docker และ Git บน Ubuntu

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

ตรวจสอบ:

```bash
docker --version
docker compose version
```

---

### 4.2 Clone project จาก GitHub

```bash
cd /opt
sudo git clone https://github.com/nuttmycar/MT-API.git
cd MT-API
```

ถ้าต้องการแก้ไฟล์สะดวก อาจเปลี่ยน owner:

```bash
sudo chown -R $USER:$USER /opt/MT-API
```

---

### 4.3 ตั้งค่า environment สำหรับ production

#### ไฟล์ root `.env`

คัดลอกจาก template:

```bash
cp .env.docker.example .env
nano .env
```

ตัวอย่าง:

```env
APP_PORT=8080
DB_EXPOSE_PORT=3307
DB_NAME=mt_api
DB_USER=mtapi_user
DB_PASS=change_this_db_password
DB_ROOT_PASSWORD=change_this_root_password
```

#### ไฟล์ `backend/.env`

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

ตัวอย่างค่า production:

```env
DB_HOST=db
DB_PORT=3306
DB_NAME=mt_api
DB_USER=mtapi_user
DB_PASS=change_this_db_password

PORT=3000
NODE_ENV=production

JWT_SECRET=replace_with_a_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_admin_password

MIKROTIK_HOST=192.168.10.1
MIKROTIK_PORT=80
MIKROTIK_USER=mtapi
MIKROTIK_PASS=replace_mikrotik_password
MIKROTIK_SSL=false
MIKROTIK_OS_VERSION=v7

FRONTEND_URL=https://your-domain.com
```

> ถ้าใช้ `RouterOS v6` ให้ตั้ง `MIKROTIK_OS_VERSION=v6`

---

### 4.4 เปิด firewall

ถ้าใช้ `ufw`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

### 4.5 Build และ start services

จาก root โปรเจกต์:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

เช็กสถานะ:

```bash
docker compose -f docker-compose.prod.yml ps
```

ดู log:

```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f db
```

---

### 4.6 ตรวจสอบหลัง deploy

เช็ก health:

```bash
curl http://localhost:8080/api/health
```

ถ้าตอบ:

```json
{"status":"ok"}
```

ถือว่า backend พร้อมทำงานผ่าน frontend proxy แล้ว

เปิดหน้าเว็บจาก browser:

```text
http://SERVER_IP:8080
```

หรือถ้าตั้ง reverse proxy ไว้แล้ว:

```text
https://your-domain.com
```

---

## 5) ตั้ง Domain + HTTPS ด้วย Nginx (แนะนำสำหรับ production)

ถ้าต้องการให้เข้าใช้งานแบบ `https://your-domain.com` แนะนำให้ใช้ `Nginx` หน้า Docker stack

### 5.1 ติดตั้ง Nginx และ Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 5.2 สร้าง Nginx config

มีไฟล์ตัวอย่างเตรียมไว้แล้วใน repo:

- `deploy/nginx/mt-api.http-only.conf.example`
- `deploy/nginx/mt-api.production.conf.example`

คัดลอกไปใช้บน server ได้เลย เช่น:

```bash
sudo cp deploy/nginx/mt-api.http-only.conf.example /etc/nginx/sites-available/mt-api.conf
sudo nano /etc/nginx/sites-available/mt-api.conf
```

ให้แก้ค่า `your-domain.com` เป็น domain จริงของคุณ และ config นี้จะ proxy ไปที่ app ซึ่งรันอยู่ที่ `127.0.0.1:8080`

เปิดใช้งาน:

```bash
sudo ln -s /etc/nginx/sites-available/mt-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.3 เปิด HTTPS ด้วย Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

ตรวจสอบ auto-renew:

```bash
sudo systemctl status certbot.timer
```

---

## 6) วิธีอัปเดตระบบหลังจากแก้โค้ด

เมื่อมีการ push โค้ดใหม่ขึ้น GitHub แล้ว ให้ไปที่ server และรัน:

```bash
cd /opt/MT-API
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

เช็ก log หลังอัปเดต:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

---

## 7) Backup / Restore ที่ควรทำ

### สำรองฐานข้อมูล MariaDB

```bash
docker exec mt-api-db mariadb-dump -uroot -pYOUR_ROOT_PASSWORD mt_api > mt_api_backup.sql
```

### สำรองไฟล์ backup ของระบบ

```bash
tar -czf mt-api-backups.tar.gz backend/backups/
```

### สิ่งที่ควร backup เป็นประจำ

- MariaDB database
- โฟลเดอร์ `backend/backups/`
- ไฟล์ `backend/.env`
- ไฟล์ `.env`
- Nginx config (ถ้ามี)

---

## 8) วิธีหยุด / เริ่ม / รีสตาร์ทบริการ

### หยุด

```bash
docker compose -f docker-compose.prod.yml down
```

### เริ่มใหม่

```bash
docker compose -f docker-compose.prod.yml up -d
```

### รีสตาร์ทเฉพาะ backend

```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## 9) วิธีที่ 2: Deploy แบบ PM2 + Nginx (ทางเลือก)

ใช้ในกรณีที่ไม่อยากใช้ Docker และต้องการรัน backend ตรงบนเครื่อง

### 9.1 ติดตั้ง Node.js และ PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2
```

### 9.2 Backend

```bash
cd /opt/MT-API/backend
npm ci --omit=dev
cp .env.example .env
nano .env
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 9.3 Frontend

```bash
cd /opt/MT-API/frontend
npm ci
npm run build
```

จากนั้นให้ Nginx serve โฟลเดอร์ `frontend/dist/` และ proxy `/api` ไป `http://127.0.0.1:3000`

---

## 10) Checklist ก่อนเปิดใช้งานจริง

- [ ] เปลี่ยน `JWT_SECRET`
- [ ] เปลี่ยนรหัสผ่าน admin ทั้งหมด
- [ ] เปลี่ยน `DB_PASS` และ `DB_ROOT_PASSWORD`
- [ ] เปลี่ยน `MIKROTIK_PASS`
- [ ] ตั้ง `FRONTEND_URL` ให้ตรงกับ domain จริง
- [ ] เปิด firewall เฉพาะ `80/443`
- [ ] เปิด HTTPS
- [ ] ทดสอบ login admin
- [ ] ทดสอบเมนู `Users`, `Reports`, `MikroTik`, `Settings`
- [ ] ทดสอบเชื่อมต่อ MikroTik จริง
- [ ] ทดสอบ backup/restore

---

## 11) Troubleshooting เบื้องต้น

### กรณีเว็บเปิดไม่ได้

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f frontend
```

### กรณี backend error

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

### กรณี DB ไม่ขึ้น

```bash
docker compose -f docker-compose.prod.yml logs -f db
```

### กรณี MikroTik เชื่อมไม่ติด
ตรวจค่าเหล่านี้:
- `MIKROTIK_HOST`
- `MIKROTIK_PORT`
- `MIKROTIK_USER`
- `MIKROTIK_PASS`
- `MIKROTIK_OS_VERSION`
- firewall ระหว่าง server กับ router

---

## 12) Quick Commands Summary

### Start
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Update
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Stop
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 13) Recommended Final Setup

สำหรับโปรเจกต์นี้ แนะนำใช้งานจริงแบบนี้:

- OS: `Ubuntu 22.04/24.04`
- App Runtime: `Docker Compose`
- Reverse Proxy: `Nginx`
- SSL: `Let's Encrypt`
- Domain: ชี้มาที่ server จริง
- Backup: ทั้ง DB + `backend/backups/`

> ถ้าต้องการความง่ายในการดูแลและย้ายเครื่องในอนาคต ให้ยึดแนวทาง **Docker + Nginx + HTTPS** เป็นหลัก
