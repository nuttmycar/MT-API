# MT-API Update Runbook (From GitHub)

Use this SOP when a server is already running an older MT-API version and needs to be updated from GitHub safely.

## Scope
- Deployment type: Docker Compose
- Recommended compose files:
  - `docker-compose.prod.yml`
  - `docker-compose.ubuntu.yml`
- Target branch: `main`

## 1) Pre-Update Checklist

```bash
cd ~/MT-API
git status
git branch --show-current
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml ps
```

Expected:
- Branch is `main`
- No unexpected local edits (or you know exactly why they exist)
- Current containers are running

## 2) Backup Before Update (Required)

```bash
# Save current commit for rollback reference
git rev-parse --short HEAD

# Backup database
mkdir -p backups/manual
BACKUP_FILE="backups/manual/db_before_update_$(date +%Y%m%d_%H%M%S).sql"
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec mt-api-db \
  mysqldump -u mt_user -p mt_api > "$BACKUP_FILE"
echo "Backup saved: $BACKUP_FILE"
```

## 3) Pull Latest Code from GitHub

```bash
git fetch origin
git checkout main
git pull origin main
git log --oneline -n 3
```

## 4) Deploy Updated Services

Low-downtime update (app services only):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build backend frontend
```

If infrastructure/config changed and you want full rebuild:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build
```

## 5) Post-Update Verification

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml ps
curl -f http://localhost:8080/api/health
docker logs --tail=150 mt-api-backend
docker logs --tail=80 mt-api-frontend
```

Expected:
- `mt-api-db` is `healthy`
- `mt-api-backend` is `healthy`
- frontend is `started`
- `/api/health` returns HTTP 200

## 6) Functional Smoke Test (Current Release)

1. Open Settings page and verify QR coupon section exists.
2. Save these 3 values:
   - Hotspot Login URL
   - Coupon Brand Name
   - Coupon Title
3. Open User Management and generate/print coupon.
4. Confirm QR coupon uses the values saved in Settings.

## 7) Rollback Procedure

### 7.1 Roll back code

```bash
# Find previous good commit
git log --oneline -n 10

# Switch back to known good commit on main
git checkout main
git reset --hard <GOOD_COMMIT>

# Rebuild to old version
docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml up -d --build
```

### 7.2 Restore database (if data/schema issue)

```bash
cat backups/manual/db_before_update_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.prod.yml -f docker-compose.ubuntu.yml exec -T mt-api-db \
  mysql -u mt_user -p mt_api
```

## 8) Operating Notes

- Avoid deleting Docker volumes during normal update.
- Avoid `docker compose down` if only code is changing.
- Run updates during low-traffic windows.
- Keep at least one verified backup before every production update.

## 9) Quick Copy/Paste Block

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

## 10) Night Shift Quick SOP (10 Commands)

Run one line at a time:

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
