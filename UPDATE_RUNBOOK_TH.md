# MT-API คู่มืออัปเดตระบบจาก GitHub (ฉบับหน้างาน)

ใช้เอกสารนี้เมื่อเครื่องเซิร์ฟเวอร์ใช้งาน MT-API เวอร์ชันเก่าอยู่แล้ว และต้องการอัปเดตโค้ดล่าสุดจาก GitHub อย่างปลอดภัย

## ขอบเขต
- รูปแบบการ deploy: Docker Compose
- ไฟล์ compose ที่แนะนำ:
  - `docker-compose.prod.yml`
  - `docker-compose.ubuntu.yml`
- สาขาเป้าหมาย: `main`

## 1) เช็กลิสต์ก่อนอัปเดต

```bash
cd ~/MT-API
git status
git branch --show-current
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml ps
```

ค่าที่คาดหวัง:
- อยู่บน branch `main`
- ไม่มีไฟล์แก้ไขค้างที่ไม่ทราบที่มา
- คอนเทนเนอร์ปัจจุบันทำงานปกติ

## 2) สำรองข้อมูลก่อนอัปเดต (บังคับ)

```bash
# เก็บ commit ปัจจุบันไว้สำหรับ rollback
git rev-parse --short HEAD

# สำรองฐานข้อมูล
mkdir -p backups/manual
BACKUP_FILE="backups/manual/db_before_update_$(date +%Y%m%d_%H%M%S).sql"
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec mt-api-db \
  mysqldump -u mt_user -p mt_api > "$BACKUP_FILE"
echo "Backup saved: $BACKUP_FILE"
```

## 3) ดึงโค้ดล่าสุดจาก GitHub

```bash
git fetch origin
git checkout main
git pull origin main
git log --oneline -n 3
```

## 4) Deploy เวอร์ชันใหม่

อัปเดตแบบลด downtime (เฉพาะแอป):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build backend frontend
```

ถ้าต้องการอัปเดตทั้งระบบ:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build
```

## 5) ตรวจสอบหลังอัปเดต

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml ps
curl -f http://localhost:8080/api/health
docker logs --tail=150 mt-api-backend
docker logs --tail=80 mt-api-frontend
```

ค่าที่คาดหวัง:
- `mt-api-db` เป็น `healthy`
- `mt-api-backend` เป็น `healthy`
- frontend เป็น `started`
- `/api/health` ตอบ HTTP 200

## 6) ทดสอบฟังก์ชันหลัก (รอบ release นี้)

1. เปิดหน้า Settings และตรวจว่ามีส่วนตั้งค่าคูปอง QR
2. บันทึกค่า 3 รายการ:
   - Hotspot Login URL
   - ชื่อแบรนด์บนคูปอง
   - หัวข้อบนคูปอง
3. เปิดหน้า User Management แล้วสร้าง/พิมพ์คูปอง
4. ยืนยันว่าคูปองและ QR ใช้ค่าที่บันทึกจาก Settings

## 7) วิธี Rollback

### 7.1 ย้อนโค้ดกลับ

```bash
# หา commit ล่าสุด
git log --oneline -n 10

# ย้อนกลับไป commit ที่ใช้งานได้
git checkout main
git reset --hard <GOOD_COMMIT>

# build กลับเป็นเวอร์ชันเดิม
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build
```

### 7.2 คืนฐานข้อมูล (กรณี schema/data มีปัญหา)

```bash
cat backups/manual/db_before_update_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec -T mt-api-db \
  mysql -u mt_user -p mt_api
```

## 8) ข้อควรปฏิบัติ

- หลีกเลี่ยงการลบ Docker volume ระหว่างการอัปเดตปกติ
- หลีกเลี่ยง `docker compose down` หากแค่เปลี่ยนโค้ด
- ควรอัปเดตช่วงเวลาที่ผู้ใช้น้อย
- ต้องมีไฟล์ backup ที่ตรวจสอบได้ก่อนทุกครั้ง

## 9) ชุดคำสั่งรวดเร็ว (คัดลอกไปรัน)

```bash
cd ~/MT-API && \
BACKUP_FILE="backups/manual/db_before_update_$(date +%Y%m%d_%H%M%S).sql" && \
mkdir -p backups/manual && \
git rev-parse --short HEAD && \
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec mt-api-db mysqldump -u mt_user -p mt_api > "$BACKUP_FILE" && \
git fetch origin && git checkout main && git pull origin main && \
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build backend frontend && \
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml ps && \
curl -f http://localhost:8080/api/health
```

## 10) SOP ฉบับเวรกลางคืน (10 คำสั่ง)

ให้รันทีละบรรทัด:

```bash
cd ~/MT-API
git status
git rev-parse --short HEAD
mkdir -p backups/manual
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec mt-api-db mysqldump -u mt_user -p mt_api > backups/manual/db_before_update_$(date +%Y%m%d_%H%M%S).sql
git fetch origin
git checkout main
git pull origin main
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build backend frontend
curl -f http://localhost:8080/api/health
```
