# MT-API Deployment Guide

เอกสารนี้สรุป 2 วิธี deploy ที่แนะนำสำหรับโปรเจกต์นี้

## Option A: Docker / Container (แนะนำ)

### ไฟล์ที่เตรียมไว้แล้ว
- `docker-compose.prod.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`

### ขั้นตอนใช้งาน
1. คัดลอก `/.env.docker.example` เป็น `/.env` ที่ root โปรเจกต์ หากต้องการกำหนด `APP_PORT`, `DB_ROOT_PASSWORD`, หรือค่า DB สำหรับ Docker Compose

2. แก้ค่า `backend/.env` ให้เป็นค่าจริงบน production
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
   - `MIKROTIK_HOST`, `MIKROTIK_USER`, `MIKROTIK_PASS`
   - `FRONTEND_URL` ให้ตรงกับ URL จริง เช่น `http://SERVER_IP` หรือ `https://your-domain.com`

3. จากโฟลเดอร์ root ของโปรเจกต์ รัน:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. ตรวจสอบสถานะ:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs -f backend
   ```

5. เปิดใช้งานผ่าน browser:
   - Frontend: `http://SERVER_IP` หรือ `http://localhost`
   - Backend health check: `http://SERVER_IP/api/health`

### หมายเหตุ
- MariaDB data จะถูกเก็บใน Docker volume: `mariadb_data`
- Backup files ของระบบจะถูกเก็บที่ `backend/backups/`
- ถ้าต้องการเปลี่ยนพอร์ตหน้าเว็บ ใช้ตัวแปร `APP_PORT` เช่น:
  ```bash
  APP_PORT=8080 docker compose -f docker-compose.prod.yml up -d --build
  ```

### How-To: อัปเดตหน้างานจาก GitHub (เครื่องที่ deploy ไปแล้ว)

ใช้ขั้นตอนนี้เมื่อเครื่อง production/staging ใช้งานเวอร์ชันเก่าอยู่แล้ว และต้องการอัปเดตเป็นโค้ดล่าสุดจาก GitHub โดยไม่ล้างข้อมูลเดิม

#### 1) Pre-check ก่อนอัปเดต
```bash
cd /path/to/MT-API
git status
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml ps
```

#### 2) Backup ก่อนอัปเดต (แนะนำมาก)
```bash
# เก็บ commit ปัจจุบันไว้สำหรับ rollback
git rev-parse --short HEAD

# Backup DB
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec mt-api-db \
   mysqldump -u mt_user -p mt_api > backup_before_update_$(date +%Y%m%d_%H%M%S).sql
```

#### 3) ดึงโค้ดล่าสุดจาก GitHub
```bash
git fetch origin
git checkout main
git pull origin main
```

#### 4) Rebuild และ restart เฉพาะ service ที่เปลี่ยน
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build backend frontend
```

ถ้าต้องการให้ชัวร์ทั้ง stack:
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build
```

#### 5) ตรวจสุขภาพหลังอัปเดต
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml ps
docker logs --tail=120 mt-api-backend
curl -f http://localhost/api/health
```

#### 6) Smoke test ฟีเจอร์ที่เปลี่ยนรอบล่าสุด
- หน้า Settings ต้องมีส่วน `ตั้งค่าคูปอง QR`
- บันทึก 3 ค่าได้: `Hotspot Login URL`, `ชื่อแบรนด์บนคูปอง`, `หัวข้อบนคูปอง`
- หน้า User Management แสดง/พิมพ์คูปองโดยใช้ค่าจาก Settings ล่าสุด

#### 7) Rollback (กรณีพบปัญหา)
```bash
# ดู commit ล่าสุด
git log --oneline -n 5

# ย้อนกลับไป commit ที่ต้องการ
git checkout main
git reset --hard <COMMIT_OLD>

# rebuild กลับไปเวอร์ชันเดิม
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build
```

ถ้าต้องคืนฐานข้อมูลจากไฟล์ backup:
```bash
cat backup_before_update_YYYYMMDD_HHMMSS.sql | \
   docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec -T mt-api-db \
   mysql -u mt_user -p mt_api
```

#### 8) แนวทางลด downtime
- รันคำสั่งอัปเดตช่วงเวลาที่ผู้ใช้งานน้อย
- หลีกเลี่ยงการลบ volume ถ้าไม่จำเป็น
- หลีกเลี่ยง `down` ทั้งระบบถ้าเพียงแค่อัปเดตแอป (ใช้ `up -d --build backend frontend` แทน)

---

## Option B: VM / VPS + PM2 + Nginx

### Backend
1. ติดตั้ง dependency
   ```bash
   cd backend
   npm ci --omit=dev
   ```

2. ตั้งค่า `backend/.env`

3. รันด้วย PM2
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

### Frontend
1. build ไฟล์
   ```bash
   cd frontend
   npm ci
   npm run build
   ```

2. นำโฟลเดอร์ `frontend/dist/` ไป serve ผ่าน Nginx

3. ตั้ง reverse proxy `/api` ไปที่ `http://127.0.0.1:3000`

---

## Production Checklist
- เปลี่ยนรหัสผ่านใน `backend/.env` ทุกตัวที่ยังเป็นค่า default
- ตั้ง `JWT_SECRET` ให้เดายาก
- เปิด firewall เฉพาะ port ที่จำเป็น (`80/443`)
- ถ้าใช้ domain จริง แนะนำเปิด HTTPS ผ่าน Nginx + Let's Encrypt
- สำรอง MariaDB และโฟลเดอร์ `backend/backups/` อย่างสม่ำเสมอ

## Quick Recommendation
> ถ้าต้องการ deploy ง่ายและย้ายเครื่องสะดวก ให้ใช้ **Docker** ชุดนี้ได้เลย
> ถ้าต้องการ integrate กับ server Linux เดิมที่มี Nginx/PM2 อยู่แล้ว ให้ใช้ **PM2 + Nginx**
