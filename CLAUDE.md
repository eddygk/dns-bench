# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context7 Integration
When working on this project, use context7 for fetching up-to-date documentation and code examples. Add "use context7" to prompts when you need current information about:
- React 18+ patterns and hooks
- Node.js/Express API development
- DNS protocols and libraries
- Recharts or D3.js for data visualization
- shadcn/ui component patterns
- WebSocket implementations for real-time updates
- Docker best practices for development

## Spec-Kit Integration
This project follows spec-kit methodology for feature development:
- All features start with specifications in `/specs/[number]-[feature-name]/spec.md`
- Use `/specify` command to create new feature specifications
- Use `/plan` command to create implementation plans
- Constitution principles in `.specify/memory/constitution.md` are non-negotiable
- Development must follow user-first, performance-focused approach

## Current Project Status ✅

### COMPLETED FEATURES
- ✅ **React Frontend**: Modern UI with shadcn/ui design system
- ✅ **Express Backend**: TypeScript API with DNS testing engine
- ✅ **Docker Infrastructure**: Multi-container orchestration with proper networking
- ✅ **User-Configurable Local DNS**: Dashboard interface to manually set LAN DNS servers (10.10.20.30, 10.10.20.31)
- ✅ **Local DNS Backend**: API endpoints `/api/settings/local-dns` (GET/PUT) with validation
- ✅ **DNS Benchmark Integration**: Service uses user-configured DNS instead of auto-detection
- ✅ **Database Storage**: SQLite for results and history
- ✅ **Security**: Rate limiting, simplified CORS configuration, input validation
- ✅ **Styling**: Tailwind CSS with PostCSS processing
- ✅ **Testing**: Playwright browser automation
- ✅ **CORS Management**: Simplified, security-focused network access controls

### ✅ WEBSOCKET IMPLEMENTATION - COMPLETED
- ✅ **Frontend**: Uses Socket.IO client in `/web-app/client/src/pages/benchmark.tsx`
- ✅ **Backend**: Uses Socket.IO server in `/web-app/server/src/index.ts`
- ✅ **Real-time Updates**: Progress updates work correctly during benchmarks
- ✅ **Activity Log**: Shows real-time test details and domain testing progress

### 🔧 TECHNICAL IMPLEMENTATION
- **Install**: `cd /home/ansible/dns-bench/web-app/client && npm install socket.io-client`
- **Replace**: `/web-app/client/src/pages/benchmark.tsx:42` - change `new WebSocket(wsUrl)` to Socket.IO client
- **Backend**: Already uses Socket.IO server correctly in `/web-app/server/src/index.ts:40`
- **Test URL**: http://10.10.20.107:3000/benchmark

### 📍 CURRENT STATE
- **DNS Configuration**: Manual configuration via Settings page (with auto-detection fallback)
- **Example Config**: Local DNS servers can be set to IPs like 10.10.20.30 (Primary), 10.10.20.31 (Secondary)
- **API Working**: `/api/dns/current` returns configured or auto-detected servers
- **Backend Working**: Benchmarks complete in 6-10 seconds with full statistics
- **Frontend Working**: Real-time updates via Socket.IO showing progress and results

### VERIFIED WORKING
- 🌐 **Frontend**: http://localhost:3000 (React + Vite dev server)
- 🔌 **Backend API**: http://localhost:3001/api/health (Express + TypeScript)
- 🔍 **DNS Detection**: `curl http://localhost:3001/api/dns/current`
- 🐳 **Docker**: All services built and running with host IP detection
- 🎨 **UI**: Beautiful shadcn/ui components with proper styling
- 📱 **Responsive**: Works on desktop, tablet, mobile
- 🔒 **Security**: Helmet, rate limiting, Docker-native CORS configuration
- ⚙️ **Settings**: Comprehensive CORS management with real-time status display

### ✅ ENHANCED FAILURE DIAGNOSTICS - COMPLETED
- ✅ **Tabbed Results Interface**: Overview, Failures, Server Analysis, Raw Diagnostics
- ✅ **Repeat Offender Detection**: Identifies domains failing 2+ times with detailed tracking
- ✅ **Server Failure Analysis**: Per-server breakdown showing problematic DNS servers
- ✅ **Raw Diagnostics**: Technical DNS query output for troubleshooting
- ✅ **Smart Recommendations**: Actionable insights based on performance data
- ✅ **Enhanced Visibility**: Transforms buried failure data into intuitive interface

### VERIFIED WORKING FEATURES
- 🧪 **Testing Integration**: Frontend fully connected to backend benchmarking
- 📊 **Live Charts**: Real-time visualization of DNS test results working
- 📈 **History Views**: Browse and compare past benchmark results functional
- ⚙️ **Custom Settings**: User-configurable DNS servers and test options active
- 🔍 **Failure Analysis**: Complete visibility into DNS test failures and diagnostics

## Project Overview

DNS Bench Web is a modern, containerized DNS benchmarking web application that transforms the original CLI tool into a full-stack web experience. The application provides real-time DNS performance testing with interactive visualizations and comprehensive result analytics.

## Architecture

The project consists of:
- **Frontend**: React 18 + TypeScript with shadcn/ui design system served by Vite
- **Backend**: Express.js + TypeScript API with WebSocket support for real-time updates
- **Database**: SQLite for storing benchmark history and results
- **Infrastructure**: Docker Compose orchestration with Redis for caching
- **Legacy CLI**: Original shell installer scripts maintained for reference

## Key Implementation Details

### Web Application Features

#### Frontend (React + shadcn/ui)
- **Dashboard**: Clean interface showing current DNS configuration and quick actions
- **Real-time Testing**: Live progress updates via WebSocket connections
- **Result Visualization**: Charts and tables using Recharts library
- **Theme Support**: Light/dark mode with CSS variables
- **Responsive Design**: Works on desktop, tablet, and mobile devices

#### Backend API (Express.js + TypeScript)
- **DNS Detection**: Auto-detects system DNS via resolv.conf, systemd-resolve, NetworkManager
- **Concurrent Testing**: Tests 20 diverse domains using dig command with timeout controls
- **Statistics Engine**: Calculates avg, min, max, median response times and success rates
- **WebSocket Updates**: Real-time progress broadcasting to connected clients
- **Data Persistence**: SQLite database for benchmark history and results

#### Public DNS Servers Tested
Benchmarks against 10 public DNS providers:
- **Cloudflare**: 1.1.1.1, 1.0.0.1
- **Google**: 8.8.8.8, 8.8.4.4
- **Quad9**: 9.9.9.9, 149.112.112.112
- **OpenDNS**: 208.67.222.222, 208.67.220.220
- **Level3**: 4.2.2.1, 4.2.2.2

## Development Commands

### Docker Development
```bash
# Start development environment
make dev

# Build all images
make build

# View logs
make logs

# Clean up
make clean
```

### Manual Docker Commands
```bash
# Start all services
docker-compose up -d

# Restart specific service
docker-compose restart client

# View service logs
docker logs dns-bench_client_1
docker logs dns-bench_server_1
```

### Access Points
```bash
# Frontend (React App)
http://localhost:3000

# Backend API
http://localhost:3001/api/health
http://localhost:3001/api/dns/current

# Redis Cache
localhost:6379
```

### Testing with Playwright
```bash
# Use Playwright MCP tools for browser testing
# Navigate, take screenshots, test interactions
```

## Important Implementation Notes

### Web Application
- Frontend served by Vite development server with hot reloading
- Backend uses Express.js with TypeScript and comprehensive error handling
- WebSocket connections provide sub-100ms real-time updates
- PostCSS configuration required for Tailwind CSS processing
- Docker containers share build context from `/web-app` directory

### DNS Testing Engine
- Filters out localhost DNS servers (127.x.x.x addresses) automatically
- Uses 2-second timeout for DNS queries with configurable retry attempts
- Requires `dig` command in Docker containers (installed via bind-tools)
- Concurrent testing with configurable worker limits (default: 3)
- Statistical validation with multiple measurement rounds

### Security & Performance
- Rate limiting on API endpoints (100 requests per 15 minutes)
- Input validation using Zod schemas
- Docker-native CORS configuration following containerization best practices
- Helmet.js security headers
- SQLite database with automatic cleanup of old results

### CORS Network Access Management
- **Simplified Security Model**: Removed complex auto-detection that violated Docker isolation principles
- **Always-On Localhost**: Localhost access permanently enabled for development (no toggle confusion)
- **Environment-Based Host IP**: Uses Docker environment variables (HOST_IP) for LAN access configuration
- **Real-Time Status Display**: Settings page shows current access configuration with enabled/disabled states
- **Flexible Custom Origins**: Single interface for adding specific hostnames and URLs
- **LAN Access**: Clear display of actual URLs clients use: `http://10.10.20.107:3000`

## Port Management & Development Guidelines

### 🚨 CRITICAL: Port Management Protocol
**ALWAYS follow these steps to prevent port conflicts:**

1. **Before starting development servers:**
   ```bash
   # Check what's using the expected ports
   lsof -i :3000  # Frontend (React/Vite)
   lsof -i :3001  # Backend (Express API)

   # Kill any stuck processes BEFORE starting new ones
   pkill -f "vite"      # Kill all Vite processes
   pkill -f "node.*server"  # Kill any Node servers
   ```

2. **Standard Port Allocation:**
   - **Frontend (Vite)**: Port 3000 - `http://localhost:3000`
   - **Backend (Express)**: Port 3001 - `http://localhost:3001`
   - **Redis Cache**: Port 6379 - `localhost:6379`

3. **Development Server Startup Protocol:**
   ```bash
   # Start in correct order, wait for each to fully start
   cd /home/ansible/dns-bench/web-app/server && npm run dev  # Start backend first
   cd /home/ansible/dns-bench/web-app/client && npm run dev  # Then frontend
   ```

4. **CORS Configuration:**
   - Backend CORS is configured for port 3000 frontend access
   - If frontend starts on different port (3002, etc.), CORS will block requests
   - **Always ensure frontend runs on port 3000 for proper CORS function**

5. **Troubleshooting Port Issues:**
   ```bash
   # If ports are occupied, clean restart:
   pkill -f "vite|node.*server"  # Kill all related processes
   rm -rf web-app/client/node_modules/.vite  # Clear Vite cache
   # Then restart servers in order
   ```

6. **Never Start Multiple Instances:**
   - Each port should have exactly ONE process
   - Always check `lsof -i :<port>` before starting servers
   - Kill existing processes rather than allowing port changes

### 🔧 Permission Issues Prevention:
```bash
# Fix node_modules permissions before starting:
sudo chown -R $USER:$USER web-app/client/node_modules
sudo chown -R $USER:$USER web-app/server/node_modules
```

## Docker Disk Space Management

### Disk Space Cleanup Script
**Location:** `/home/ansible/dns-bench/docker-cleanup.sh`

**Purpose:** Safely clean up unused Docker resources to recover disk space during development

**Usage:**
```bash
# Run the cleanup script when disk space is low
./docker-cleanup.sh

# Check current Docker space usage
docker system df

# Quick check of overall disk usage
df -h /
```

**What it cleans:**
- ✅ Stopped containers (preserves running containers)
- ✅ Dangling images (`<none>` tagged images)
- ✅ Unused networks (preserves default networks)
- ✅ Unused volumes (dangling volumes)
- ✅ Docker build cache (all cached layers)
- ✅ npm cache (`~/.npm`)
- ✅ apt package cache (`/var/cache/apt`)
- ✅ VS Code extension cache (`~/.vscode-server/data/CachedExtensionVSIXs`)
- ✅ Old temporary files (`/tmp` files older than 7 days)

**Safety Features:**
- ❌ Never touches source code files
- ❌ Never removes running containers
- ❌ Never removes images used by active containers
- ✅ Shows preview of what will be cleaned
- ✅ Requires user confirmation before cleanup
- ✅ Colored output with clear progress indicators
- ✅ Handles Docker dependency conflicts gracefully
- ✅ Uses safe error handling (continues on partial failures)

**When to use:** Run when experiencing disk space issues, build failures, or after frequent Docker rebuilds. Typically safe to run weekly during active development.

**Major Space Consumers (for reference):**
- VS Code Server extensions/cache: ~647MB
- Go runtime (/usr/lib/go-1.18): ~316MB (removable if not needed)
- Node.js via NVM: ~283MB
- Development caches (~/.cache): ~155MB
- Project node_modules: Varies by project

**Additional Space Recovery:**
- Consider removing unused Go runtime: `sudo rm -rf /usr/lib/go-1.18` (saves 316MB)
- Clean VS Code entirely if not needed: `rm -rf ~/.vscode-server` (saves 647MB)
- Remove unused Node versions: `nvm uninstall <version>` (saves ~280MB per version)