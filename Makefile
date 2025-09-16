.PHONY: help dev build up down logs clean install test lint

# Default target
help:
	@echo "DNS Bench Web Application"
	@echo ""
	@echo "Available commands:"
	@echo "  dev         Start development environment"
	@echo "  build       Build all Docker images"
	@echo "  up          Start all services"
	@echo "  down        Stop all services"
	@echo "  logs        Show logs from all services"
	@echo "  clean       Clean up Docker resources"
	@echo "  install     Install dependencies locally"
	@echo "  test        Run tests"
	@echo "  lint        Run linting"
	@echo ""

# Development environment
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

# Show logs
logs:
	docker-compose logs -f

# Clean up Docker resources
clean:
	docker-compose down --volumes --remove-orphans
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

# Production deployment
prod:
	docker-compose --profile production up -d

# Quick start for development
start: build dev