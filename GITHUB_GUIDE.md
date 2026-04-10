# GitHub Guide for `MT-API`

คู่มือสั้น ๆ สำหรับการ `upload`, `update`, และจัดการไฟล์ใน GitHub สำหรับโปรเจกต์นี้

---

## 1) ตรวจสอบก่อนเริ่ม

เปิด PowerShell ที่ root โปรเจกต์:

```powershell
Set-Location D:\Myproject\MT-API
git status
```

ถ้าเครื่องยังไม่เห็นคำสั่ง `git` ให้ใช้:

```powershell
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path
git --version
```

---

## 2) คำสั่งพื้นฐานสำหรับอัปเดตงานขึ้น GitHub

กรณีแก้ไฟล์แล้วต้องการอัปเดตขึ้น repo:

```powershell
git status
git add .
git commit -m "update files"
git push
```

> แนะนำให้เปลี่ยนข้อความ commit ให้สื่อความหมาย เช่น `fix hotspot sync`, `update README`, `add deploy guide`

---

## 3) อัปโหลดโปรเจกต์ครั้งแรก

```powershell
Set-Location D:\Myproject\MT-API
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/MT-API.git
git push -u origin main
```

หากตั้ง `origin` ไปแล้ว ใช้:

```powershell
git remote -v
```

---

## 4) ดึงงานล่าสุดก่อน push

ถ้ามีการแก้ไฟล์บน GitHub หรืออีกเครื่องหนึ่ง ให้ดึงมาก่อน:

```powershell
git pull --rebase origin main
```

จากนั้นค่อย push:

```powershell
git push
```

---

## 5) ดูว่าไฟล์ไหนถูกแก้ไขอยู่

```powershell
git status
```

ดู commit ล่าสุด:

```powershell
git log --oneline -n 5
```

ดู remote ปัจจุบัน:

```powershell
git remote -v
```

---

## 6) แก้ไขไฟล์แล้ว push เฉพาะบางไฟล์

ตัวอย่างเช่นแก้ `README.md` หรือ `DEPLOYMENT.md`:

```powershell
git add README.md DEPLOYMENT.md
git commit -m "docs: update README and deployment guide"
git push
```

---

## 7) ลบไฟล์ออกจาก GitHub

ถ้าต้องการลบไฟล์จาก repo:

```powershell
git rm path/to/file
git commit -m "remove unused file"
git push
```

ตัวอย่าง:

```powershell
git rm .env.docker.example
git commit -m "remove docker env template"
git push
```

---

## 8) หยุด track ไฟล์ แต่เก็บไว้ในเครื่อง

เหมาะกับไฟล์ลับ เช่น `.env` หรือไฟล์ backup:

```powershell
git rm --cached backend/.env
git rm --cached .env
git commit -m "stop tracking env files"
git push
```

---

## 9) ไฟล์ที่ไม่ควร push ขึ้น GitHub

โปรเจกต์นี้ควร **ไม่ push** ไฟล์เหล่านี้:

- `backend/.env`
- `.env`
- `backend/backups/`
- `dist/`
- `node_modules/`

ควรเก็บเฉพาะไฟล์ตัวอย่าง เช่น:

- `backend/.env.example`
- `frontend/.env.example`
- `.env.docker.example`

---

## 10) ถ้า push ไม่ผ่านบ่อย ๆ

### กรณี `failed to push some refs`
```powershell
git pull --rebase origin main
git push
```

### กรณี `Author identity unknown`
```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### กรณี `src refspec main does not match any`
แปลว่ายังไม่มี commit แรก ให้รัน:

```powershell
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

---

## 11) Workflow ที่แนะนำสำหรับโปรเจกต์นี้

ทุกครั้งที่แก้ระบบเสร็จ ให้ใช้ลำดับนี้:

```powershell
Set-Location D:\Myproject\MT-API
git status
git add .
git commit -m "describe your change"
git pull --rebase origin main
git push
```

---

## 12) แก้ไฟล์บนหน้า GitHub โดยตรง

ถ้าต้องการแก้ผ่านเว็บ GitHub:

1. เปิด repo
2. เข้าไฟล์ที่ต้องการแก้
3. กดไอคอน ✏️ `Edit`
4. แก้ไขเนื้อหา
5. กด `Commit changes`

เหมาะกับการแก้ `README.md`, `DEPLOYMENT.md`, หรือเอกสารทั่วไป

---

## Quick Copy / Paste

```powershell
Set-Location D:\Myproject\MT-API
git status
git add .
git commit -m "update files"
git pull --rebase origin main
git push
```
