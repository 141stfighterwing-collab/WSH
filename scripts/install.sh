#!/bin/bash

# WSH - Weavenote Self Hosted Installation Script
# This script sets up everything needed for WSH to run

set -e

echo "================================================"
echo "  WSH - Weavenote Self Hosted Installer"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo -e "${GREEN}Detected OS: $OS${NC}"
echo ""

# Check for Docker
check_docker() {
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker is installed${NC}"
        return 0
    else
        echo -e "${RED}✗ Docker is not installed${NC}"
        return 1
    fi
}

# Check for Docker Compose
check_docker_compose() {
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose is installed${NC}"
        return 0
    else
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
        return 1
    fi
}

# Check for Node.js
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js is installed ($NODE_VERSION)${NC}"
        return 0
    else
        echo -e "${RED}✗ Node.js is not installed${NC}"
        return 1
    fi
}

# Install local dependencies
install_local() {
    echo ""
    echo -e "${YELLOW}Installing local dependencies...${NC}"
    
    # Copy env file if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from template${NC}"
    fi
    
    # Install npm dependencies
    npm install
    echo -e "${GREEN}✓ Installed npm dependencies${NC}"
    
    # Generate Prisma Client
    npx prisma generate
    echo -e "${GREEN}✓ Generated Prisma Client${NC}"
    
    echo ""
    echo -e "${YELLOW}Setting up PostgreSQL database...${NC}"
    echo "Make sure PostgreSQL is running and DATABASE_URL in .env is correct."
    echo ""
    
    # Push database schema
    npx prisma db push
    echo -e "${GREEN}✓ Database schema created${NC}"
    
    # Create admin user
    echo ""
    echo -e "${YELLOW}Creating admin user...${NC}"
    npx ts-node scripts/create-admin.ts
    echo -e "${GREEN}✓ Admin user created${NC}"
    
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "To start the application:"
    echo "  npm run dev"
    echo ""
    echo "Then open http://localhost:3000 in your browser."
    echo ""
    echo "Default admin credentials:"
    echo "  Email: admin@wsh.local"
    echo "  Password: admin123"
    echo ""
}

# Install with Docker
install_docker() {
    echo ""
    echo -e "${YELLOW}Starting Docker installation...${NC}"
    
    # Copy env file if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from template${NC}"
    fi
    
    # Build and start containers
    docker-compose up -d --build
    echo -e "${GREEN}✓ Docker containers started${NC}"
    
    # Wait for PostgreSQL
    echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
    sleep 10
    
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "WSH is now running on http://localhost:3000"
    echo ""
    echo "Default admin credentials:"
    echo "  Email: admin@wsh.local"
    echo "  Password: admin123"
    echo ""
    echo "To stop: docker-compose down"
    echo "To view logs: docker-compose logs -f"
    echo ""
}

# Main installation flow
main() {
    echo "Checking prerequisites..."
    echo ""
    
    HAS_DOCKER=false
    HAS_NODE=false
    
    if check_docker && check_docker_compose; then
        HAS_DOCKER=true
    fi
    
    if check_node; then
        HAS_NODE=true
    fi
    
    echo ""
    
    if [ "$HAS_DOCKER" = true ]; then
        echo -e "${YELLOW}How would you like to install WSH?${NC}"
        echo "  1) Docker (Recommended - automatic PostgreSQL setup)"
        echo "  2) Local (Requires existing PostgreSQL)"
        read -p "Enter choice [1-2]: " choice
        
        case $choice in
            1)
                install_docker
                ;;
            2)
                if [ "$HAS_NODE" = true ]; then
                    install_local
                else
                    echo -e "${RED}Node.js is required for local installation.${NC}"
                    exit 1
                fi
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                exit 1
                ;;
        esac
    elif [ "$HAS_NODE" = true ]; then
        echo -e "${YELLOW}Docker not found. Using local installation...${NC}"
        echo -e "${YELLOW}Note: You need PostgreSQL installed and running.${NC}"
        read -p "Continue with local installation? [y/N]: " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            install_local
        else
            echo "Installation cancelled."
            exit 0
        fi
    else
        echo -e "${RED}Please install Docker or Node.js to continue.${NC}"
        echo ""
        echo "Docker: https://docs.docker.com/get-docker/"
        echo "Node.js: https://nodejs.org/"
        exit 1
    fi
}

main "$@"
