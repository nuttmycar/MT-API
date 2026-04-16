#!/bin/bash

################################################################################
# MT-API Ubuntu Setup Script
# Tested on: Ubuntu 24.04.4 LTS
# Purpose: Automated setup and deployment of MT-API with Docker Compose
################################################################################

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running on Ubuntu
check_os() {
    print_header "Checking Operating System"
    
    if [ ! -f /etc/os-release ]; then
        print_error "This script is designed for Ubuntu/Debian systems"
        exit 1
    fi
    
    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        print_warning "This script is optimized for Ubuntu/Debian. Your system: $ID"
    fi
    
    print_success "OS: $PRETTY_NAME"
}

# Update system packages
update_system() {
    print_header "Updating System Packages"
    
    sudo apt-get update
    sudo apt-get upgrade -y
    
    print_success "System packages updated"
}

# Install Docker
install_docker() {
    print_header "Installing Docker & Docker Compose"
    
    if command -v docker &> /dev/null; then
        print_success "Docker already installed: $(docker --version)"
    else
        print_info "Installing Docker..."
        sudo apt-get install -y docker.io
        print_success "Docker installed"
    fi
    
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose already installed: $(docker-compose --version)"
    else
        print_info "Installing Docker Compose..."
        sudo apt-get install -y docker-compose
        print_success "Docker Compose installed"
    fi
    
    # Also install compose plugin (V2)
    if ! docker compose version &> /dev/null; then
        print_info "Installing Docker Compose V2 plugin..."
        sudo apt-get install -y docker-compose-plugin
    fi
}

# Setup Docker permissions
setup_docker_permissions() {
    print_header "Setting Up Docker Permissions"
    
    if ! groups $USER | grep &> /dev/null '\bdocker\b'; then
        print_info "Adding user to docker group..."
        sudo usermod -aG docker $USER
        print_warning "You need to log out and log back in for changes to take effect"
        print_warning "Or run: newgrp docker"
    else
        print_success "User already in docker group"
    fi
    
    # Start Docker service
    print_info "Ensuring Docker daemon is running..."
    sudo systemctl start docker
    sudo systemctl enable docker
    print_success "Docker daemon is running"
}

# Check port availability
check_ports() {
    print_header "Checking Port Availability"
    
    local ports=(8080 3000 3307)
    local ports_available=true
    
    for port in "${ports[@]}"; do
        if sudo netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            print_warning "Port $port is already in use"
            ports_available=false
        else
            print_success "Port $port is available"
        fi
    done
    
    if [ "$ports_available" = false ]; then
        print_warning "Some ports may be in conflict. Please review and adjust docker-compose.prod.yml"
    fi
}

# Setup firewall
setup_firewall() {
    print_header "Setting Up Firewall (UFW)"
    
    if ! command -v ufw &> /dev/null; then
        print_warning "UFW not installed. Skipping firewall setup."
        return
    fi
    
    if sudo ufw status | grep -q "Status: inactive"; then
        print_info "UFW is inactive. Skipping..."
        return
    fi
    
    print_info "Opening required ports..."
    sudo ufw allow 8080/tcp || true  # Frontend
    sudo ufw allow 3000/tcp || true  # Backend
    sudo ufw allow 3307/tcp || true  # Database (if needed)
    
    print_success "Firewall rules updated"
}

# Create project directories
create_directories() {
    print_header "Creating Project Directories"
    
    local dirs=("backups/auto" "logs" "data")
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        else
            print_info "Directory already exists: $dir"
        fi
    done
}

# Setup environment file
setup_env() {
    print_header "Setting Up Environment Configuration"
    
    if [ -f .env ]; then
        print_warning ".env file already exists"
        read -p "Do you want to back it up and create a new one? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
            print_success "Backed up to .env.backup.*"
        else
            print_info "Keeping existing .env file"
            return
        fi
    fi
    
    if [ ! -f .env.example ]; then
        print_error ".env.example not found! Please ensure it exists in the root directory."
        return 1
    fi
    
    # Copy example to .env
    cp .env.example .env
    print_success "Created .env from .env.example"
    
    # Prompt for critical values
    print_info "Configure critical values in .env:"
    
    read -p "Enter MikroTik Host (default: 192.168.10.1): " mikrotik_host
    mikrotik_host=${mikrotik_host:-192.168.10.1}
    sed -i "s/MIKROTIK_HOST=.*/MIKROTIK_HOST=$mikrotik_host/" .env
    
    read -p "Enter MikroTik Username (default: bbapi): " mikrotik_user
    mikrotik_user=${mikrotik_user:-bbapi}
    sed -i "s/MIKROTIK_USER=.*/MIKROTIK_USER=$mikrotik_user/" .env
    
    read -sp "Enter MikroTik Password (default: eepower): " mikrotik_pass
    echo
    mikrotik_pass=${mikrotik_pass:-eepower}
    # Escape special chars for sed
    mikrotik_pass_escaped=$(printf '%s\n' "$mikrotik_pass" | sed -e 's/[\/&]/\\&/g')
    sed -i "s/MIKROTIK_PASS=.*/MIKROTIK_PASS=$mikrotik_pass_escaped/" .env
    
    read -p "Enter Database Password (default: secure_password_change_this): " db_pass
    db_pass=${db_pass:-secure_password_change_this}
    db_pass_escaped=$(printf '%s\n' "$db_pass" | sed -e 's/[\/&]/\\&/g')
    sed -i "s/DB_PASS=.*/DB_PASS=$db_pass_escaped/" .env
    
    print_success "Environment file configured"
}

# Build and start containers
start_containers() {
    print_header "Building and Starting Containers"
    
    if [ ! -f docker-compose.prod.yml ]; then
        print_error "docker-compose.prod.yml not found!"
        return 1
    fi
    
    print_info "This may take a few minutes on first run..."
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker compose -f docker-compose.prod.yml up -d --build
    
    print_success "Containers started"
}

# Wait for services
wait_for_services() {
    print_header "Waiting for Services to Be Ready"
    
    print_info "Waiting for database..."
    for i in {1..30}; do
        if docker compose -f docker-compose.prod.yml exec -T mt-api-db mysqladmin ping -h localhost &> /dev/null; then
            print_success "Database is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    print_info "Waiting for backend API..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
            print_success "Backend API is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    print_info "Waiting for frontend..."
    for i in {1..15}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            print_success "Frontend is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
}

# Health check
health_check() {
    print_header "Running Health Checks"
    
    local health_ok=true
    
    # Check API health
    if response=$(curl -s http://localhost:8080/api/health); then
        if echo "$response" | grep -q "ok"; then
            print_success "API Health: OK"
        else
            print_error "API Health: FAILED ($response)"
            health_ok=false
        fi
    else
        print_error "API Health: UNREACHABLE"
        health_ok=false
    fi
    
    # Check containers
    print_info "Container Status:"
    docker compose -f docker-compose.prod.yml ps
    
    return 0
}

# Print summary
print_summary() {
    print_header "Setup Complete! 🎉"
    
    echo -e "${GREEN}MT-API is ready to use!${NC}\n"
    echo "📍 Access Points:"
    echo "   Frontend:     http://localhost:8080"
    echo "   Backend API:  http://localhost:3000/api"
    echo "   Database:     localhost:3307"
    echo ""
    echo "📁 Important Directories:"
    echo "   Config:       .env"
    echo "   Backups:      backups/auto/"
    echo "   Logs:         logs/"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   View logs:           docker compose -f docker-compose.prod.yml logs -f"
    echo "   Stop containers:     docker compose -f docker-compose.prod.yml down"
    echo "   Start containers:    docker compose -f docker-compose.prod.yml up -d"
    echo "   Restart all:         docker compose -f docker-compose.prod.yml restart"
    echo "   View container info: docker compose -f docker-compose.prod.yml ps"
    echo ""
    echo "📖 Next Steps:"
    echo "   1. Open http://localhost:8080 in your browser"
    echo "   2. Login with your credentials"
    echo "   3. Configure MikroTik connection in Settings"
    echo ""
}

# Main execution
main() {
    clear
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║         MT-API Ubuntu Setup Script                    ║
║     Automated Deployment for Ubuntu 24.04 LTS         ║
╚═══════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    # Run all setup steps
    check_os
    update_system
    install_docker
    setup_docker_permissions
    check_ports
    setup_firewall
    create_directories
    setup_env
    start_containers
    wait_for_services
    health_check
    print_summary
}

# Error handling
trap 'print_error "Setup failed!"; exit 1' ERR

# Run main function
main "$@"
