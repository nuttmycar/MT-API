#!/bin/bash

################################################################################
# MT-API Quick Health Check Script
# Use this to verify your MT-API installation
# Usage: bash health-check.sh
################################################################################

echo "╔════════════════════════════════════════╗"
echo "║   MT-API Health Check                  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Docker
echo "🐳 Docker Status:"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
    docker --version
else
    echo -e "${RED}✗${NC} Docker is not installed"
fi
echo ""

# Check Docker daemon
echo "🔌 Docker Daemon:"
if docker ps &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
else
    echo -e "${RED}✗${NC} Docker daemon is not running"
    echo "   Try: sudo systemctl start docker"
fi
echo ""

# Check containers
echo "📦 Containers:"
if docker compose -f docker-compose.prod.yml ps &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose configuration found"
    echo ""
    docker compose -f docker-compose.prod.yml ps
else
    echo -e "${RED}✗${NC} docker-compose.prod.yml not found in current directory"
    echo "   Make sure you're in the MT-API project root"
fi
echo ""

# Check ports
echo "🔓 Port Status:"
for port in 8080 3000 3307; do
    if sudo netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port is in use"
    else
        echo -e "${YELLOW}⚠${NC} Port $port is not bound"
    fi
done
echo ""

# Check API health
echo "🌐 API Health:"
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    response=$(curl -s http://localhost:8080/api/health)
    echo -e "${GREEN}✓${NC} API is responding"
    echo "   Response: $response"
else
    echo -e "${RED}✗${NC} API is not responding"
    echo "   Make sure containers are running: docker compose -f docker-compose.prod.yml up -d"
fi
echo ""

# Check frontend
echo "🌍 Frontend:"
if curl -s http://localhost:8080 | grep -q "<!DOCTYPE" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Frontend is accessible"
    echo "   Open: http://localhost:8080"
else
    echo -e "${YELLOW}⚠${NC} Frontend may not be ready"
fi
echo ""

# Check disk space
echo "💾 Disk Usage:"
df_output=$(df -h / | tail -1)
usage=$(echo $df_output | awk '{print $5}')
echo "Current usage: $usage"
if [ "${usage%\%}" -gt 80 ]; then
    echo -e "${RED}⚠${NC} Warning: Disk usage is above 80%"
else
    echo -e "${GREEN}✓${NC} Disk space is healthy"
fi
echo ""

# Check memory
echo "🧠 Memory Usage:"
free_output=$(free -h | grep Mem)
echo "Memory: $(echo $free_output | awk '{print $2}') total, $(echo $free_output | awk '{print $3}') used"
echo ""

# Check .env file
echo "📋 Configuration:"
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check critical vars
    if grep -q "MIKROTIK_HOST=" .env; then
        echo -e "  ${GREEN}✓${NC} MIKROTIK_HOST configured"
    else
        echo -e "  ${RED}✗${NC} MIKROTIK_HOST not configured"
    fi
    
    if grep -q "DB_PASS=" .env; then
        db_pass=$(grep "DB_PASS=" .env | cut -d'=' -f2)
        if [ "$db_pass" == "secure_password_change_this" ]; then
            echo -e "  ${YELLOW}⚠${NC} DB_PASS using default value!"
        else
            echo -e "  ${GREEN}✓${NC} DB_PASS configured"
        fi
    fi
else
    echo -e "${RED}✗${NC} .env file not found"
    echo "   Create one: cp .env.example .env"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════╗"
echo "║   Health Check Summary                 ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📍 Access Points:"
echo "   • Frontend:  http://localhost:8080"
echo "   • API:       http://localhost:3000/api"
echo "   • Database:  localhost:3307"
echo ""
echo "📝 Helpful Commands:"
echo "   • View logs:      docker compose -f docker-compose.prod.yml logs -f"
echo "   • Stop:           docker compose -f docker-compose.prod.yml down"
echo "   • Start:          docker compose -f docker-compose.prod.yml up -d"
echo "   • Restart:        docker compose -f docker-compose.prod.yml restart"
echo "   • Status:         docker compose -f docker-compose.prod.yml ps"
echo ""
