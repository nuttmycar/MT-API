# ✅ MT-API — สรุปฟีเจอร์ปัจจุบัน (อัปเดตล่าสุด)

> เอกสารนี้อ้างอิงจากโค้ดปัจจุบันใน `frontend/src/App.jsx`, `Sidebar.jsx`, `UserManagement.jsx`, `SystemStatus.jsx`, `ReportsCenter.jsx`, `Settings.jsx`, `MikroTikDashboard.jsx`, `AccessControlManager.jsx` และ backend routes ณ วันที่ `2026-04-10`

---

## 📋 ภาพรวมระบบ

`MT-API` เป็นระบบจัดการ `MikroTik Hotspot` แบบครบชุด ประกอบด้วย:

- ระบบลงทะเบียนผู้ใช้หน้า public
- ระบบอนุมัติ/จัดการผู้ใช้ฝั่ง admin
- Dashboard ติดตามสถานะระบบและ MikroTik
- Reports / Audit / Notifications / Backup
- Role & Permission Management
- Settings สำหรับฐานข้อมูล, MikroTik, PDPA/Consent, Branding
- เอกสาร deploy, Docker, Nginx และ GitHub guide

---

## 🧭 เมนูหลักใน Dashboard

เมนูใน `Sidebar` ปัจจุบันรองรับตามสิทธิ์ของ role ดังนี้:

1. `👥 ผู้ใช้`
2. `📊 สถานะระบบ`
3. `🗂️ รายงาน`
4. `🐧 MikroTik`
5. `🧷 IP Binding`
6. `🌍 Walled Garden`
7. `⚙️ Settings`
8. `🛡️ Role & Permission`
9. `🚪 ออกจากระบบ`

คุณสมบัติ UI หลัก:
- Sidebar แบบ `collapsible`
- แสดง/ซ่อนเมนูตาม `permissions`
- รองรับ branding เช่น `logo`, `app name`, `browser title`
- แยก `Admin Console` / `Viewer Console` ตามสิทธิ์ผู้ใช้

---

## 1️⃣ ระบบลงทะเบียนและจัดการผู้ใช้ (User Management)

ไฟล์หลัก:
- `frontend/src/components/UserManagement.jsx`
- `backend/src/routes/requestRoutes.js`
- `backend/src/controllers/requestController.js`

### ฟีเจอร์หน้า Public Registration
- ฟอร์มลงทะเบียนผู้ใช้ Hotspot
- กรอกข้อมูลได้หลายช่อง เช่น:
  - ชื่อ-นามสกุล
  - username / email / password
  - profile
  - เลขบัตรประชาชน
  - เบอร์โทรศัพท์
  - ตำแหน่ง / แผนก
- รองรับ `Registration Code` แบบเปิด/ปิดได้จาก Settings
- รองรับ `Consent / PDPA` แบบแก้ไขข้อความได้
- มี checkbox ยืนยันเงื่อนไขและความถูกต้องของข้อมูล

### ฟีเจอร์หน้า Admin / User Management
- แสดงสถิติผู้ใช้:
  - ทั้งหมด
  - รออนุมัติ
  - อนุมัติแล้ว
- แยกแท็บ `Pending`, `Approved`, `Gen / Import`
- ค้นหาและแบ่งหน้า (`search + pagination`)
- แก้ไขข้อมูลผู้ใช้ (`edit`)
- อนุมัติผู้ใช้ (`approve`)
- ยกเลิกอนุมัติ (`cancel approval`)
- ปิด/เปิด user บน MikroTik (`disable / enable user`)
- ลบรายการ (`delete`)
- แสดงสถานะ user บน MikroTik เช่น `Active`, `Disabled`, `Not found`

### การเชื่อมกับ MikroTik ตอน approve
- เมื่ออนุมัติ user ระบบจะ sync กับ MikroTik hotspot user
- รองรับการ `enable`, `disable`, `remove` จากฝั่ง admin
- ตรวจสอบสถานะจาก RouterOS ได้โดยตรง

---

## 2️⃣ ระบบ Generate / Import ผู้ใช้ + คูปอง QR

อยู่ในแท็บ `Gen / Import` ของ `UserManagement`

### รองรับการนำเข้าไฟล์
- `.bat`
- `.csv`
- `.txt` ลักษณะ key=value / separated values

### ฟีเจอร์ generate อัตโนมัติ
- กำหนดจำนวน user (`count`)
- กำหนด prefix
- กำหนดความยาว `username`
- กำหนดความยาว `password`
- เลือก `profile`

### ฟีเจอร์จัดการรายการ batch
- แก้ไขข้อมูลแต่ละแถวก่อน import
- เลือกหลายรายการพร้อมกัน
- import เฉพาะรายการที่เลือกได้
- ลบรายการที่เลือกได้

### ฟีเจอร์คูปอง / QR / export
- พิมพ์คูปอง (`Print Coupons`)
- สร้าง `QR Code` สำหรับ login hotspot
- กำหนด `Hotspot Login URL`
- ตั้ง `coupon brand` และ `coupon title`
- copy username/password ทั้งชุด
- export รายการเป็น `CSV`

---

## 3️⃣ System Monitoring Dashboard

ไฟล์หลัก:
- `frontend/src/components/SystemStatus.jsx`
- `backend/src/routes/systemRoutes.js`
- `backend/src/utils/systemInfo.js`

### สิ่งที่แสดงได้
- `CPU Usage`
- `RAM Usage`
- `Storage / Disk`
- `Uptime`
- `Top Processes` (เมื่อเปิด option `includeProcesses`)
- `timestamp` และ health state ของระบบ

### ความสามารถเพิ่มเติม
- `Manual refresh`
- `Auto refresh`
- เลือกช่วง refresh เช่น `5s / 10s / 30s / 60s`
- color-coded status เช่น เขียว / เหลือง / แดง
- แจ้งเตือน CPU / RAM / storage เมื่อใช้ทรัพยากรสูง

### API ที่เกี่ยวข้อง
```http
GET /api/system/stats
GET /api/system/quick
GET /api/system/notifications
```

---

## 4️⃣ Reports Center / Audit / Notifications / Backup

ไฟล์หลัก:
- `frontend/src/components/ReportsCenter.jsx`
- `backend/src/routes/systemRoutes.js`
- `backend/src/routes/settingsRoutes.js`
- `backend/src/utils/backupService.js`
- `backend/src/models/AuditLog.js`

### ฟีเจอร์รายงาน
- รายงานสรุปรายวัน (`daily summary`)
- `Charts + Trend analytics` เช่น:
  - approval rate
  - ค่าเฉลี่ยต่อวัน
  - เทียบช่วงก่อนหน้า (`previous period comparison`)
  - peak day / top departments
- ตัวกรองตาม:
  - ช่วงวันที่
  - สถานะ
  - แผนก
  - ตำแหน่ง
- export รายงานผู้ใช้เป็น `CSV` หรือ `JSON`

### Audit Log
- เก็บ log การทำงานสำคัญ เช่น:
  - create request
  - approve / cancel
  - update / delete
  - batch import
  - settings update
  - backup run
- มี endpoint สำหรับดึง audit log มาแสดงในหน้า reports

### Notification Center
- แจ้งจำนวน user ที่รออนุมัติ
- แจ้งเตือน backup ยังไม่เคยรัน
- แจ้ง error ของ auto backup
- แจ้งเตือน CPU usage สูง

### Backup / Restore
- backup settings ออกเป็นไฟล์ `.json`
- restore settings กลับเข้าระบบได้
- ดูสถานะ scheduler และ recent backup files ได้
- manual backup run จากหน้า reports ได้
- มี `auto backup scheduler` ฝั่ง backend

---

## 5️⃣ MikroTik Dashboard (RouterOS Integration)

ไฟล์หลัก:
- `frontend/src/components/MikroTikDashboard.jsx`
- `backend/src/utils/mikrotik.js`
- `backend/src/utils/mikrotikAPI.js`
- `backend/src/routes/settingsRoutes.js`

### หน้าย่อยใน MikroTik Dashboard
- `System Status`
- `Interfaces`
- `Hotspot Users`
- `Bandwidth`
- `IP Binding`
- `Walled Garden`

### ฟีเจอร์หลัก
- ดึงสถานะระบบ RouterOS
- ดึงรายการ interfaces
- ดึง hotspot users
- ดู bandwidth
- refresh ข้อมูลอัตโนมัติ
- แสดง `last update`

### RouterOS v6 / v7 Compatibility
- `RouterOS v7` ใช้แนวทาง `REST-first`
- `RouterOS v6` ใช้ `ROS-API (routeros-client)`
- มี fallback transport เพื่อไม่ให้กระทบระบบเดิม
- มี diagnostics แสดงบนหน้าจอ เช่น:
  - `preferred transport`
  - `active transport`
  - `apiPort`
  - `restPort`
  - `dataSource`

---

## 6️⃣ IP Binding Management

ไฟล์หลัก:
- `frontend/src/components/MikroTikDashboard.jsx`
- `backend/src/utils/mikrotik.js`

### รองรับการจัดการครบชุด
- ดูรายการ `IP Binding`
- filter ตาม `server / type / status / search`
- เพิ่มรายการใหม่
- แก้ไขรายการ
- เปิด / ปิดการใช้งาน
- ลบรายการ
- ดึงรายชื่อ `Hotspot Server` จริงจาก MikroTik มาใช้ใน dropdown

---

## 7️⃣ Walled Garden Management

ไฟล์หลัก:
- `frontend/src/components/MikroTikDashboard.jsx`
- `backend/src/utils/mikrotik.js`

### รองรับการจัดการครบชุด
- ดูรายการ `Walled Garden`
- filter ตาม `search / server / action / status`
- เพิ่ม rule ใหม่
- แก้ไข rule
- เปิด / ปิดการใช้งาน
- ลบ rule
- รองรับข้อมูลเช่น:
  - `dst-host`
  - `path`
  - `dst-port`
  - `protocol`
  - `action`
  - `comment`

---

## 8️⃣ Settings Module

ไฟล์หลัก:
- `frontend/src/components/Settings.jsx`
- `backend/src/routes/settingsRoutes.js`

### 8.1 Positions / Departments
- CRUD ตำแหน่ง (`positions`)
- CRUD แผนก (`departments`)
- มีทั้ง public endpoint และ protected endpoint
- ใช้ร่วมกับฟอร์มลงทะเบียนหน้า public

### 8.2 Registration Code
- ตั้งค่า code สำหรับเปิด/ปิดการลงทะเบียน
- ตรวจสอบ code ก่อน submit ได้

### 8.3 Consent / PDPA / Terms
- แก้ไขหัวข้อและข้อความเงื่อนไขได้
- แก้ไขข้อความ checkbox ได้
- เปิด/ปิดการบังคับยืนยันความถูกต้องของข้อมูลได้

### 8.4 App Branding
- เปลี่ยนชื่อระบบ (`appName`)
- subtitle
- dashboard title / subtitle
- footer text
- `logo`
- `favicon`
- `browser title`

### 8.5 Database Settings
- ตั้งค่า host / port / database / username / password
- test connection ได้จากหน้า Settings

### 8.6 MikroTik Settings
- ตั้งค่า IP / host / port / username / password
- เลือก `OS Version` (`v6` / `v7`)
- ทดสอบการเชื่อมต่อได้

---

## 9️⃣ Role & Permission Management

ไฟล์หลัก:
- `frontend/src/components/AccessControlManager.jsx`
- `backend/src/utils/accessControl.js`
- `backend/src/middleware/authMiddleware.js`
- `backend/src/controllers/authController.js`

### ระบบ role ปัจจุบัน
- `super_admin`
- `admin`
- `viewer`
- custom roles ที่เพิ่มเองได้จากหน้า UI

### ฟีเจอร์สำคัญ
- ติ๊กกำหนดว่า role ไหนเห็นเมนูอะไรบ้าง
- กำหนด `action-level permissions` เพิ่มได้ เช่น:
  - `approve / edit / delete / import`
  - `export / backup / restore`
  - `settings update / test`
  - `view login history`
- บันทึก permissions ลงฐานข้อมูล
- สร้าง / แก้ไข / ลบ `managed dashboard users`
- บัญชีจาก `.env` ถูกแสดงเป็น `read-only`
- backend ตรวจสิทธิ์ระดับ section จริง ไม่ได้ซ่อนแค่เมนู frontend
- มี endpoint `GET /api/auth/me` เพื่อ sync โปรไฟล์และ permissions ปัจจุบัน

---

## 🔔 Smart Alerts + Login History

- ตั้งค่าแจ้งเตือนผ่าน `LINE` และ `Telegram` ได้จากหน้า `Settings`
- มี `Test Alert` เพื่อลองส่งข้อความได้ทันที
- ตั้ง trigger ได้ เช่น:
  - pending approvals เกิน threshold
  - CPU usage สูง
  - backup error
- มี `cooldown` กันการส่งซ้ำรัว ๆ
- เก็บ `Login History` ทั้งสำเร็จและไม่สำเร็จ พร้อมเวลา, username, role, IP และ message

---

## 🔐 ความปลอดภัยและการควบคุมสิทธิ์

- ใช้ `JWT` สำหรับ admin login
- ใช้ middleware `protect`, `requireRole`, `requireSectionAccess`, `requireAnySectionAccess`, `requireActionAccess`
- route สำคัญมี `auditAction` เพื่อเก็บ log
- แยกสิทธิ์ `viewer` ให้ใช้งานแบบอ่านอย่างเดียวในหลายเมนู

---

## 🌐 เอกสารและไฟล์สำหรับ Deploy / GitHub

นอกจากตัวระบบหลัก ยังมีเอกสารและไฟล์ช่วยใช้งานจริงเพิ่มแล้ว เช่น:

- `DEPLOYMENT.md` — คู่มือ deploy แบบย่อ
- `SERVER_DEPLOY_GUIDE.md` — คู่มือ deploy server แบบละเอียด
- `GITHUB_GUIDE.md` — คู่มือ upload / update โค้ดขึ้น GitHub
- `docker-compose.prod.yml` — production compose
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `deploy/nginx/mt-api.production.conf.example`
- `deploy/nginx/mt-api.http-only.conf.example`

---

## 🛠️ Backend Routes สำคัญที่มีอยู่แล้ว

### Auth
```http
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/login-history
```

### Requests / Users
```http
POST   /api/requests
GET    /api/requests
GET    /api/requests/stats
GET    /api/requests/daily-summary
POST   /api/requests/batch-import
POST   /api/requests/:id/approve
POST   /api/requests/:id/cancel-approval
POST   /api/requests/:id/disable-user
POST   /api/requests/:id/enable-user
PUT    /api/requests/:id
DELETE /api/requests/:id
```

### System / Reports
```http
GET /api/system/stats
GET /api/system/quick
GET /api/system/notifications
```

### Settings / Branding / Consent / Backup
```http
GET/POST /api/settings/branding
GET/POST /api/settings/registration-consent
GET/POST /api/settings/registration-code
GET/POST /api/settings/database
GET/POST /api/settings/alerts
POST     /api/settings/alerts/test
GET      /api/settings/backup
GET      /api/settings/backup/status
POST     /api/settings/backup/run
POST     /api/settings/restore
GET      /api/settings/audit-logs
```

### MikroTik / Access Control
```http
GET/POST/PUT/DELETE /api/settings/mikrotik/*
GET/POST            /api/settings/access-control
POST/PUT/DELETE     /api/settings/access-control/users/*
```

---

## ✅ สรุปสถานะฟีเจอร์ปัจจุบัน

- [x] Public registration + consent / PDPA
- [x] User approval workflow + MikroTik sync
- [x] Batch import / generated users / QR coupon print
- [x] System monitoring dashboard
- [x] Reports center + filters + export
- [x] Audit log + notification center
- [x] Auto backup scheduler + backup/restore
- [x] MikroTik Dashboard
- [x] IP Binding CRUD
- [x] Walled Garden CRUD
- [x] App branding / logo / favicon / browser title
- [x] RouterOS v6 / v7 compatibility layer
- [x] Role & Permission Management
- [x] Managed dashboard users
- [x] Docker / Nginx / Server deployment guide
- [x] GitHub upload/update guide

---

## 📌 หมายเหตุ

ถ้าต้องการอัปเดตเอกสารนี้ในอนาคต แนะนำให้ตรวจไฟล์เหล่านี้ก่อน:

- `frontend/src/App.jsx`
- `frontend/src/components/*.jsx`
- `backend/src/routes/*.js`
- `backend/src/utils/accessControl.js`
- `backend/src/utils/mikrotik.js`
- `README.md`

เพื่อให้ `FEATURES_ADDED.md` ตรงกับสถานะจริงของระบบเสมอ
