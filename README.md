# MT-API

โปรเจกต์ตัวอย่างสำหรับระบบจัดการ MikroTik Hotspot ด้วย Node.js (Express) และ React + Tailwind CSS

## โครงสร้าง

- `backend/` : Express API + MariaDB + Sequelize + routeros-client สำหรับเชื่อม MikroTik
- `frontend/` : React + Tailwind UI สำหรับ Admin Dashboard

## ความต้องการ (Prerequisites)

- Node.js >= 14
- MariaDB/MySQL Server
- MikroTik RouterOS `v6` หรือ `v7`

## ตั้งค่า MariaDB

1. สร้าง database:
   ```bash
   mysql -u root -p < backend/schema.sql
   ```

2. หรือรัน SQL command ด้วยตัวเอง:
   ```sql
   CREATE DATABASE IF NOT EXISTS mt_api;
   USE mt_api;
   -- จากนั้นกระหวานผ้า schema.sql เพื่อสร้าง table
   ```

## การติดตั้ง

1. Backend
   ```bash
   cd MT-API/backend
   npm install
   cp .env.example .env
   # แก้ค่า MariaDB host/port/user/pass ใน .env ให้ตรงกับ server ของคุณ
   npm run dev
   ```

2. Frontend
   ```bash
   cd MT-API/frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

## Deploy ใช้งานจริง

- ใช้ชุด container ที่เตรียมไว้ได้จาก `docker-compose.prod.yml`
- รายละเอียดอยู่ใน `DEPLOYMENT.md`

## Security Note

- ไม่ควร commit ไฟล์ `backend/.env`, `.env`, หรือไฟล์ backup จริงขึ้น GitHub
- ให้เก็บเฉพาะไฟล์ตัวอย่าง เช่น `.env.example` และ `.env.docker.example`

## ฟีเจอร์ที่มีเพิ่มแล้ว

- ✅ `Audit Log` สำหรับ approve / delete / import / backup / restore
- ✅ `Role & Permission` ระดับ `Super Admin`, `Admin`, `Viewer`
- ✅ `Notification Center` แจ้ง pending approvals และสถานะระบบ
- ✅ `Auto Backup Scheduler` พร้อมสั่งรัน backup ได้ทันที
- ✅ `Reports Filter` กรองรายงานตามช่วงวันที่และสถานะ

## Credit / Copyright

- หากคุณเป็นผู้พัฒนาโค้ดนี้เอง โดยไม่ได้โอนสิทธิ์ให้บุคคลอื่นผ่านสัญญา **โดยทั่วไปคุณมีลิขสิทธิ์ในโค้ดของคุณอัตโนมัติ**
- ถ้าพัฒนาในนามบริษัท/หน่วยงาน หรือทำภายใต้สัญญาจ้าง ต้องตรวจเงื่อนไขในสัญญาอีกครั้ง
- ไลบรารีภายนอกยังคงอยู่ภายใต้ license ของเจ้าของเดิม
- สามารถกำหนดเครดิตเจ้าของระบบได้ที่ไฟล์ `COPYRIGHT.md`

## RouterOS v6 / v7 Compatibility

- `RouterOS v7` ใช้ **REST-first** ตามระบบเดิม
- `RouterOS v6` ใช้ **RouterOS API (`routeros-client`)** เพื่อให้รองรับคำสั่งที่ REST ยังไม่พร้อม
- หาก `v7 REST` ใช้งานไม่ได้บางเมนู ระบบจะพยายาม fallback ไป `RouterOS API` ให้อัตโนมัติ
- ตั้งค่าได้ที่ `Settings > MikroTik > OS Version` หรือกำหนด `MIKROTIK_OS_VERSION=v6|v7` ใน `backend/.env`

### ROS6 Field Test Checklist

เมื่อมีเครื่อง `ROS6` จริง ให้ตรวจตามนี้:

1. เปิด service ที่ MikroTik
   - `/ip service enable api`
   - หรือ `api-ssl` หากใช้งานแบบเข้ารหัส
2. ตั้งค่าในหน้า `Settings > MikroTik`
   - `IP / Host`
   - `Port = 8728` (หรือ `8729` ถ้าใช้ SSL)
   - `Username / Password`
   - `OS Version = v6`
3. กดปุ่ม `Test Connection`
   - ควรได้ผลลัพธ์ `valid: true`
   - และใน response/log จะเห็น `transport` เป็น `ROS-API`
4. ทดสอบเมนูหลักทีละส่วน
   - `System Status`
   - `Interfaces`
   - `Hotspot Users`
   - `IP Binding`
   - `Walled Garden`
5. ถ้ามีปัญหา ให้เก็บข้อมูลนี้ส่งกลับมาตรวจ
   - ค่า `os_version`
   - ค่า `transport` / `diagnostics`
   - error log จาก backend
   - รุ่น RouterOS เช่น `6.48.x` หรือ `6.49.x`

## หมายเหตุ

- ตั้งค่า MariaDB connection ใน `backend/.env` 
- ตั้งค่า API URL ใน `frontend/.env`
- ตั้งค่า MikroTik credentials ใน `backend/.env`
- สำหรับ `ROS6` แนะนำให้ใช้พอร์ต `8728/8729` (API / API-SSL)
- หากต้องการใช้บทบาทหลายระดับ ให้กำหนด `MANAGER_USERNAME`, `VIEWER_USERNAME` และ `AUTO_BACKUP_HOURS` ใน `backend/.env`
