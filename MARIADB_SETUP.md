# MariaDB Setup Guide

## Windows Installation

### ใช้ MariaDB Community Server

1. ดาวน์โหลด MariaDB Community Server จาก: https://mariadb.org/download/
2. รันตัว installer และทำตามขั้นตอน
3. เมื่อถูกถามว่า "Configure MariaDB Server now?" ให้เลือก ✓
4. ในการตั้งค่า:
   - Port: 3306
   - Root Password: root (ตรงกับใน .env file)

### ใช้ Docker (ทางเลือก)

ถ้าคุณมี Docker installed:

```bash
docker run -d ^
  --name mariadb ^
  -e MYSQL_ROOT_PASSWORD=root ^
  -e MYSQL_DATABASE=mt_api ^
  -p 3306:3306 ^
  mariadb:latest
```

## Setup Database

หลังจากติดตั้ง MariaDB สำเร็จแล้ว:

### ใช้ Command Line:

```bash
mysql -u root -p
# Enter password: root
```

จากนั้น copy ทั้งหมดจาก `schema.sql` และ run:

```sql
CREATE DATABASE IF NOT EXISTS mt_api;
USE mt_api;

CREATE TABLE IF NOT EXISTS `user_requests` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `fullName` VARCHAR(255) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `profile` VARCHAR(100) DEFAULT 'default',
  `status` ENUM('pending', 'approved') DEFAULT 'pending',
  `approvedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_status` (`status`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ใช้ MySQL Client:

```bash
mysql -u root -p < backend/schema.sql
```

## Backend Configuration

อัปเดต `backend/.env`:

```env
# MariaDB connection
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mt_api
DB_USER=root
DB_PASS=root
```

## ตรวจสอบการเชื่อมต่อ

```bash
mysql -u root -p -h localhost -P 3306 mt_api -e "SHOW TABLES;"
```

ควรแสดงตาราง `user_requests`

## ปัญหาที่มักเจอ

### "Access denied for user 'root'"
- ตรวจสอบว่า MariaDB กำลัง run อยู่
- ตรวจสอบ username/password ใน `.env`

### "Can't connect to MySQL server"
- ตรวจสอบว่า port 3306 เปิด
- ตรวจสอบ host address (localhost vs 127.0.0.1)

### "Unknown database 'mt_api'"
- รัน schema.sql เพื่อสร้าง database
- ตรวจสอบว่า database สร้างสำเร็จ
