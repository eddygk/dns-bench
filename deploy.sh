#!/bin/bash
# DNS Bench Production Deployment Script
# This script sets up and deploys DNS Bench in production mode

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="dns-bench"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi

    # Check if Docker Compose is available (try both v2 and v1)
    if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi

    # Determine which compose command to use
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    log_success "All prerequisites met"
}

# Function to setup environment
setup_environment() {
    log_info "Setting up environment..."

    # Create required directories
    mkdir -p data config logs

    # Set permissions
    chmod 755 data config logs

    # Copy environment template if .env doesn't exist
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f ".env.production" ]]; then
            cp .env.production $ENV_FILE
            log_success "Environment file created from template"
            log_warning "Please review and customize $ENV_FILE before continuing"
            read -p "Press Enter to continue after reviewing $ENV_FILE..."
        else
            log_warning "No environment template found. Creating minimal .env file"
            cat > $ENV_FILE << EOF
NODE_ENV=production
FRONTEND_PORT=80
BACKEND_PORT=3001
REDIS_PORT=6379
DOMAIN=localhost
CORS_ORIGIN=http://localhost
DATA_PATH=./data
CONFIG_PATH=./config
LOG_LEVEL=info
MAX_CONCURRENT_BENCHMARKS=3
BENCHMARK_TIMEOUT=30000
EOF
        fi
    else
        log_info "Environment file already exists"
    fi
}

# Function to detect host IP
detect_host_ip() {
    log_info "Detecting host IP address..."

    # Try multiple methods to detect the host IP
    HOST_IP=""

    # Method 1: ip route (Linux)
    if command -v ip &> /dev/null; then
        HOST_IP=$(ip route get 8.8.8.8 | grep -oP 'src \K\S+' 2>/dev/null || true)
    fi

    # Method 2: hostname -I (Linux)
    if [[ -z "$HOST_IP" ]] && command -v hostname &> /dev/null; then
        HOST_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || true)
    fi

    # Method 3: ifconfig (macOS/Linux)
    if [[ -z "$HOST_IP" ]] && command -v ifconfig &> /dev/null; then
        HOST_IP=$(ifconfig | grep -E "inet.*broadcast" | awk '{print $2}' | head -1 2>/dev/null || true)
    fi

    # Fallback
    if [[ -z "$HOST_IP" ]]; then
        HOST_IP="localhost"
        log_warning "Could not detect host IP. Using localhost"
    else
        log_success "Detected host IP: $HOST_IP"
    fi

    # Update CORS_ORIGIN in .env if it's set to localhost
    if grep -q "CORS_ORIGIN=http://localhost" $ENV_FILE; then
        sed -i.bak "s|CORS_ORIGIN=http://localhost|CORS_ORIGIN=http://$HOST_IP|g" $ENV_FILE
        log_info "Updated CORS_ORIGIN to http://$HOST_IP"
    fi
}

# Function to build and start services
deploy_services() {
    log_info "Building and deploying services..."

    # Pull latest images for base images
    log_info "Pulling latest base images..."
    $COMPOSE_CMD -f $COMPOSE_FILE pull redis

    # Build application images
    log_info "Building application images..."
    $COMPOSE_CMD -f $COMPOSE_FILE build --no-cache

    # Start services
    log_info "Starting services..."
    $COMPOSE_CMD -f $COMPOSE_FILE up -d

    # Wait for services to become healthy
    log_info "Waiting for services to become healthy..."
    timeout=120
    elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if $COMPOSE_CMD -f $COMPOSE_FILE ps | grep -E "(starting|unhealthy)" >/dev/null 2>&1; then
            log_info "Services starting... ($elapsed/$timeout seconds)"
            sleep 5
            elapsed=$((elapsed + 5))
        else
            break
        fi
    done

    # Check final status
    log_info "Checking service status..."
    $COMPOSE_CMD -f $COMPOSE_FILE ps
}

# Function to show deployment information
show_deployment_info() {
    log_success "DNS Bench deployed successfully!"
    echo
    echo "📊 Access your DNS Benchmark application:"
    echo "   Frontend: http://${HOST_IP:-localhost}:${FRONTEND_PORT:-80}"
    echo "   Backend API: http://${HOST_IP:-localhost}:${BACKEND_PORT:-3001}/api/health"
    echo
    echo "🔧 Management commands:"
    echo "   View logs: $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
    echo "   Stop services: $COMPOSE_CMD -f $COMPOSE_FILE down"
    echo "   Restart services: $COMPOSE_CMD -f $COMPOSE_FILE restart"
    echo "   Update application: ./deploy.sh update"
    echo
    echo "📁 Data is persisted in: $(pwd)/data"
    echo "⚙️  Configuration: $(pwd)/config"
    echo "📋 Logs: $(pwd)/logs"
    echo
    echo "🚀 For production deployment, consider:"
    echo "   - Setting up SSL/TLS termination"
    echo "   - Configuring a reverse proxy (nginx/traefik)"
    echo "   - Setting up log rotation"
    echo "   - Implementing monitoring and alerting"
}

# Function to update deployment
update_deployment() {
    log_info "Updating DNS Bench deployment..."

    # Pull latest changes (if in git repo)
    if [[ -d ".git" ]]; then
        log_info "Pulling latest changes from git..."
        git pull
    fi

    # Rebuild and restart services
    log_info "Rebuilding services..."
    $COMPOSE_CMD -f $COMPOSE_FILE build --no-cache

    log_info "Restarting services..."
    $COMPOSE_CMD -f $COMPOSE_FILE up -d --force-recreate

    log_success "Update completed!"
}

# Function to cleanup deployment
cleanup_deployment() {
    log_warning "This will stop and remove all containers, networks, and images."
    read -p "Are you sure you want to cleanup the deployment? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up deployment..."
        $COMPOSE_CMD -f $COMPOSE_FILE down --volumes --remove-orphans
        docker system prune -f
        log_success "Cleanup completed!"
    else
        log_info "Cleanup cancelled"
    fi
}

# Main deployment function
main() {
    cd "$SCRIPT_DIR"

    log_info "Starting DNS Bench deployment..."
    echo "Project: $PROJECT_NAME"
    echo "Directory: $SCRIPT_DIR"
    echo "Compose file: $COMPOSE_FILE"
    echo

    case "${1:-deploy}" in
        "deploy"|"start")
            check_prerequisites
            setup_environment
            detect_host_ip
            deploy_services
            show_deployment_info
            ;;
        "update")
            update_deployment
            ;;
        "stop")
            log_info "Stopping services..."
            $COMPOSE_CMD -f $COMPOSE_FILE down
            log_success "Services stopped"
            ;;
        "restart")
            log_info "Restarting services..."
            $COMPOSE_CMD -f $COMPOSE_FILE restart
            log_success "Services restarted"
            ;;
        "logs")
            $COMPOSE_CMD -f $COMPOSE_FILE logs -f
            ;;
        "status")
            $COMPOSE_CMD -f $COMPOSE_FILE ps
            ;;
        "cleanup")
            cleanup_deployment
            ;;
        "help"|"-h"|"--help")
            echo "DNS Bench Deployment Script"
            echo
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  deploy    Deploy DNS Bench (default)"
            echo "  start     Same as deploy"
            echo "  update    Update deployment with latest changes"
            echo "  stop      Stop all services"
            echo "  restart   Restart all services"
            echo "  logs      Show service logs"
            echo "  status    Show service status"
            echo "  cleanup   Remove all containers and cleanup"
            echo "  help      Show this help message"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"