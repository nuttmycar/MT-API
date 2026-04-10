# 🔍 MikroTik Integration - Debugging Guide

## ปัญหา: ข้อมูลไม่เข้า MikroTik หลังกดปุ่ม Approve

### วิธีตรวจสอบเบื้องต้น

#### 1️⃣ Step 1: ทดสอบการเชื่อมต่อ MikroTik
ก่อนอนุมัติผู้ใช้ ให้ทดสอบว่า MikroTik เชื่อมต่อได้ไหม:

```
GET http://localhost:3000/api/requests/test/mikrotik
Authorization: Bearer [YOUR_JWT_TOKEN]
```

**ผลการทดสอบ:**
- ✅ **Connected** → MikroTik ตอบสนอง ได้รับ profile
- ❌ **Connection failed** → ต่อไปที่ Step 2

##### วิธีใช้ Postman/cURL:
```bash
# ให้ login ก่อนเพื่อได้ token
# จากนั้น copy token แล้วใช้:

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/requests/test/mikrotik
```

---

#### 2️⃣ Step 2: ตรวจสอบการตั้งค่า MikroTik
ตรวจสอบไฟล์ `.env` ในโฟลเดอร์ backend:

```
MIKROTIK_HOST=192.168.0.1      ← ตรวจสอบ IP ถูกหรือไม่
MIKROTIK_PORT=8728              ← Port ต้อง 8728 (ไม่ใช่ 80 หรือ 8080)
MIKROTIK_USER=bbapi             ← ตรวจสอบ username
MIKROTIK_PASS=eepower           ← ตรวจสอบ password ถูกหรือไม่
MIKROTIK_SSL=false              ← ปกติเป็น false
```

**หากไม่แน่ใจ ให้คลิกสาย MikroTik โดยตรง:**
```
ssh bbapi@192.168.0.1
```

---

#### 3️⃣ Step 3: ทดสอบการ Approve และติดตามการทำงาน

**ขั้นตอน:**

1. **เปิด Backend Logs:**
   - ดูหน้าต่าง Terminal ที่เซิร์ฟเวอร์ backend กำลังรัน
   - ค้นหาข้อความ `[MikroTik]` และ `[ApproveRequest]`

2. **ใช้ระบบ:**
   - ไปที่ http://localhost:5173
   - Login: `admin` / `admin123`
   - ไปที่แท็บ "รอ อนุมัติ"
   - คลิก "อนุมัติ" ที่ผู้ใช้ใดก็ได้

3. **ดูผลใน Console:**

```
======= กรณีที่ 1: SUCCESS ✅ =======
[ApproveRequest] Processing request for user: testuser
[ApproveRequest] Attempting MikroTik add user...

[MikroTik] ========== ADD HOTSPOT USER ==========
[MikroTik] User: testuser
[MikroTik] Profile: default
[MikroTik] ✓ Connected to MikroTik successfully
[MikroTik] ✓ Menu /ip/hotspot/user opened
[MikroTik] User data: {
  "name": "testuser",
  "password": "password123",
  "profile": "default"
}
[MikroTik] ✓ User testuser added successfully
[MikroTik] Result ID: *101
[MikroTik] ✓ Connection closed
[MikroTik] ========================================

[ApproveRequest] MikroTik operation succeeded
[ApproveRequest] Updating database status to approved for user: testuser
[ApproveRequest] Success! User approved and saved to database


======= กรณีที่ 2: CONNECTION FAILED ❌ =======
[ApproveRequest] Processing request for user: testuser
[ApproveRequest] Attempting MikroTik add user...

[MikroTik] ========== ADD HOTSPOT USER ==========
[MikroTik] User: testuser
[MikroTik] Profile: default
[MikroTik] ✗ Connection failed - using database-only approval
[MikroTik] Connection Error: connect ETIMEDOUT 192.168.0.1:8728
[MikroTik] ========================================

[ApproveRequest] ✗ MikroTik operation failed: connect ETIMEDOUT 192.168.0.1:8728
[ApproveRequest] Continuing with database update only
[ApproveRequest] Updating database status to approved for user: testuser
[ApproveRequest] Success! User approved and saved to database


======= กรณีที่ 3: INVALID CREDENTIALS ❌ =======
[MikroTik] Connection Error: invalid user name and/or password
```

---

### 📊 การอ่าน Logs อย่างถูกต้อง

#### 1. ค้นหา Log ที่สำคัญ:
```
[ApproveRequest]  → ตรวจสอบว่า approve ถูกใช้หรือไม่
[MikroTik]        → ตรวจสอบรายละเอียด MikroTik
```

#### 2. สัญญาณการสำเร็จ (✓):
- ✅ `✓ Connected to MikroTik successfully`
- ✅ `✓ Menu /ip/hotspot/user opened`
- ✅ `✓ User [name] added successfully`
- ✅ `✓ Connection closed`

#### 3. สัญญาณปัญหา (✗):
- ❌ `✗ Connection failed`
- ❌ `connect ETIMEDOUT` → MikroTik ไม่ตอบสนอง
- ❌ `invalid user name and/or password` → credential ผิด
- ❌ `Cannot find module` → library ไม่ติดตั้ง

---

### 🛠️ วิธีแก้ไขตามอาการ

#### ❌ ปัญหา: "connect ETIMEDOUT"
**สาเหตุ:** MikroTik host ไม่ตอบสนองหรือหมดเวลา

**วิธีแก้:**
1. ตรวจสอบ IP ใน .env ถูกหรือไม่:
   ```bash
   ping 192.168.0.1
   ```

2. ตรวจสอบ port 8728 เปิดไหม:
   ```bash
   Test-NetConnection -ComputerName 192.168.0.1 -Port 8728
   ```

3. ลองใช้ SSH ดู:
   ```bash
   ssh bbapi@192.168.0.1
   ```

---

#### ❌ ปัญหา: "invalid user name and/or password"
**สาเหตุ:** Credential ใน .env ผิด

**วิธีแก้:**
1. ตรวจสอบในไฟล์ `.env`:
   ```
   MIKROTIK_USER=bbapi    <- ถูกไหม?
   MIKROTIK_PASS=eepower  <- ถูกไหม?
   ```

2. ทดสอบ login ด้วย SSH:
   ```bash
   ssh bbapi@192.168.0.1
   # ป้อน password: eepower
   ```

---

#### ❌ ปัญหา: "MikroTik operation failed" แต่ status ยัง approved
**สาเหตุ:** MikroTik ไม่เชื่อมต่อ แต่ database update สำเร็จ

**นี่คือ NORMAL ✅ ระบบออกแบบเช่นนี้:**
- Database update สำคัญกว่า = ผู้ใช้บันทึกลง database แล้ว ✅
- MikroTik optional = ถ้า MikroTik ไม่พร้อม ยังใช้ได้ผ่าน database ✅

**ทำไมแบบนี้?** เพื่อความเสถียร - ไม่บังคับ MikroTik ต้องเชื่อมต่อเสมอ

---

### ✅ ตรวจสอบผลลัพธ์

#### ทั่วทั้ง Frontend:
```javascript
// คลิก Approve → ดูผลลัพธ์ใน Response:
{
  "id": 1,
  "fullName": "John Doe",
  "username": "johndoe",
  "status": "approved",
  "approvedAt": "2026-04-07T10:30:00.000Z",
  "mikrotikSuccess": true    ← ← ← สำคัญ!
}
```

**ความหมาย:**
- `"mikrotikSuccess": true` = ข้อมูลสำเร็จเข้า MikroTik ✅
- `"mikrotikSuccess": false` = MikroTik ไม่เชื่อมต่อ แต่ database saved ✅

#### ใน MikroTik เอง (RouterOS):
```
IP > Hotspot > Users
```
ควรเห็นผู้ใช้ใหม่ที่เพิ่งเกิด approve

---

### 📋 Checklist การแก้ไข

- [ ] 1. ทดสอบ Test Endpoint: `GET /api/requests/test/mikrotik`
- [ ] 2. ตรวจสอบ .env ถูก (IP, Port, User, Pass)
- [ ] 3. ทดสอบ Approve และดู Console logs
- [ ] 4. ตรวจสอบ `mikrotikSuccess` ใน Response
- [ ] 5. ถ้า connected ✅ ตรวจสอบใน MikroTik 
- [ ] 6. ถ้าไม่ connected → แก้ IP/Port/Credential

---

### 💬 ตัวอย่าง Logs ที่ดี

```
[ApproveRequest] Processing request for user: newuser
[ApproveRequest] Attempting MikroTik add user...
[MikroTik] ========== ADD HOTSPOT USER ==========
[MikroTik] User: newuser
[MikroTik] Profile: default
[MikroTik] Comment: Approved user newuser
[MikroTik] ✓ Connected to MikroTik successfully
[MikroTik] ✓ Menu /ip/hotspot/user opened
[MikroTik] Preparing to send add command...
[MikroTik] User data: {
  "name": "newuser",
  "password": "password123",
  "profile": "default",
  "comment": "Approved user newuser"
}
[MikroTik] ✓ User newuser added successfully
[MikroTik] Result ID: *102
[MikroTik] ✓ Connection closed
[MikroTik] ========================================
[ApproveRequest] MikroTik operation succeeded
[ApproveRequest] Updating database status to approved for user: newuser
[ApproveRequest] Success! User approved and saved to database
```

---

### 🎯 หากยังมีปัญหา:

1. **บันทึก Error Message ที่แสดงใน Console**
2. **โปรดแบ่งปันข้อความใน Step 3 กับฉัน**
3. **ถ่ายหน้าจอของ Console logs**

