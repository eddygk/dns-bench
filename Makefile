.PHONY: help dev dev-fast build up down logs clean install test lint

# Default target
help:
	@echo "🚀 DNS Bench Development Commands"
	@echo ""
	@echo "Fast Development (Recommended):"
	@echo "  dev-fast     Start optimized dev environment with instant hot reloading"
	@echo "  build-fast   Build optimized development containers"
	@echo "  logs-fast    View optimized development logs"
	@echo ""
	@echo "Standard Development:"
	@echo "  dev          Start standard development environment"
	@echo "  build        Build all Docker images"
	@echo "  up           Start all services"
	@echo "  down         Stop all services"
	@echo "  logs         Show logs from all services"
	@echo ""
	@echo "Utilities:"
	@echo "  clean        Clean up Docker resources"
	@echo "  install      Install dependencies locally"
	@echo "  test         Run tests"
	@echo "  lint         Run linting"
	@echo "  status       Show development environment status"
	@echo ""

# Fast development with optimized Docker setup (RECOMMENDED)
dev-fast:
	@echo "🏃‍♂️ Starting optimized development environment..."
	@mkdir -p ./data && chmod 755 ./data
	docker-compose -f docker-compose.dev.yml up --build

# Build optimized development containers
build-fast:
	@echo "⚡ Building optimized development containers..."
	docker-compose -f docker-compose.dev.yml build --parallel

# View optimized development logs
logs-fast:
	docker-compose -f docker-compose.dev.yml logs -f

# Standard development environment
dev:
	docker-compose up --build client server redis

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# Show logs
logs:
	docker-compose logs -f

# Clean up Docker resources
clean:
	@echo "🧹 Cleaning up all Docker resources..."
	docker-compose down --volumes --remove-orphans
	docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans
	docker system prune -f

# Install dependencies locally (for IDE support)
install:
	cd web-app && npm install
	cd web-app/client && npm install
	cd web-app/server && npm install
	cd web-app/shared && npm install

# Run tests
test:
	docker-compose exec client npm test
	docker-compose exec server npm test

# Run linting
lint:
	docker-compose exec client npm run lint
	docker-compose exec server npm run lint

# Development status check
status:
	@echo "📊 Development Environment Status:"
	@echo ""
	@echo "🐳 Docker Containers:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep dns-bench || echo "No DNS Bench containers running"
	@echo ""
	@echo "📡 Service Health:"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:3001/api/health"
	@echo "Redis: localhost:6379"

# Production deployment
prod:
	docker-compose --profile production up -d

# Quick start for fast development (RECOMMENDED)
start: build-fast dev-fast