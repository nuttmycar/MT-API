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
