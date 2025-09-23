# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Tools Available

### Context7 Integration
Use context7 for fetching up-to-date documentation and code examples:
- React 18+ patterns and hooks
- Node.js/Express API development
- DNS protocols and libraries
- Recharts or D3.js for data visualization
- shadcn/ui component patterns
- WebSocket implementations for real-time updates
- Docker best practices for development

### GitHub MCP
Complete GitHub repository management:
- Issues, PRs, commits, workflows
- Code search, file operations
- Review submissions, branch management

### Playwright MCP
Browser automation for testing:
- Navigate, click, type, screenshot
- Form filling, element interaction
- Network monitoring, console logs

### shadcn MCP
Component library management:
- Search/view shadcn components
- Get installation commands
- Find usage examples

### Perplexity MCP
Web search and reasoning:
- Real-time web information
- Complex reasoning tasks

### IDE MCP
Development environment integration:
- VS Code diagnostics
- Jupyter code execution

## Spec-Kit Integration
This project follows spec-kit methodology for feature development:
- All features start with specifications in `/specs/[number]-[feature-name]/spec.md`
- Use `/specify` command to create new feature specifications
- Use `/plan` command to create implementation plans
- Constitution principles in `.specify/memory/constitution.md` are non-negotiable
- Development must follow user-first, performance-focused approach

## DNS Benchmark Gap Analysis Tracking
**IMPORTANT**: This project aims to bridge the gap with industry-standard DNS benchmarking methodologies.

### Gap Analysis Documentation
- **Primary Document**: `/DNS_BENCHMARK_GAP_ANALYSIS.md` - Comprehensive feature gap analysis and implementation roadmap
- **Reference Material**: `/reference-dns-benchmark.md` - Reference DNS benchmark output for analysis

### Development Directive
When implementing DNS benchmark features, ALWAYS:
1. **Update Gap Analysis**: After implementing any feature, update the status in `/DNS_BENCHMARK_GAP_ANALYSIS.md`
2. **Mark Completed Features**: Move features from "Critical Gaps" to "✅ COMPLETED FEATURES" section
3. **Track Progress**: Update the feature comparison matrix with current status
4. **Reference Benchmark Output**: Use `/reference-dns-benchmark.md` as the reference for expected behavior and output format
5. **Maintain Roadmap**: Adjust timeline estimates and priorities based on actual implementation progress

### Current Priority Focus
Based on the gap analysis, prioritize implementation in this order:
1. **CRITICAL**: Three query types (cached/uncached/dotcom), statistical analysis, security testing
2. **HIGH**: Intelligent recommendations engine, server identification, behavioral analysis
3. **MEDIUM**: Auto-discovery, advanced export options, historical trending

### Success Metrics
- Match industry testing depth (50+ domains, 3 query types)
- Implement statistical significance analysis (confidence intervals, standard deviation)
- Add security features (DNS rebinding protection, NXDOMAIN hijacking detection)
- Create professional-grade conclusions with actionable recommendations

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
- **Test URL**: http://YOUR_HOST_IP:3000/benchmark

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
- 🚀 **Benchmarks**: Quick and Full benchmarks run successfully with real-time updates
- 📊 **History Page**: Displays past benchmark results correctly
- 🔧 **Process Management**: Clean startup sequence prevents port conflicts

### ✅ ENHANCED FAILURE DIAGNOSTICS - COMPLETED
- ✅ **Tabbed Results Interface**: Overview, Failures, Server Analysis, Raw Diagnostics
- ✅ **Repeat Offender Detection**: Identifies domains failing 2+ times with detailed tracking
- ✅ **Server Failure Analysis**: Per-server breakdown showing problematic DNS servers
- ✅ **Per-Server Domain Analysis**: Collapsible server entries showing detailed domain-by-domain test results
- ✅ **Raw Diagnostics**: Technical DNS query output for troubleshooting
- ✅ **Smart Recommendations**: Actionable insights based on performance data
- ✅ **Enhanced Visibility**: Transforms buried failure data into intuitive interface

### ✅ CONFIGURABLE DNS SERVERS - COMPLETED
- ✅ **Public DNS Management**: Users can add, edit, enable/disable public DNS servers via Settings UI
- ✅ **Pre-configured Providers**: Built-in support for Cloudflare, Google, Quad9, OpenDNS, Level3
- ✅ **Custom DNS Servers**: Add unlimited custom public DNS servers (max 20 total)
- ✅ **Granular Control**: Enable/disable individual servers without deleting configuration
- ✅ **Smart Server Selection**: Quick tests use top 3 enabled + local DNS, full tests use all enabled servers
- ✅ **Persistent Configuration**: Settings saved to `public-dns.json` with API endpoints `/api/settings/public-dns`
- ✅ **Fixed Server Naming**: Local DNS servers display as IP only (e.g., 10.10.20.30 instead of Current-10.10.20.30)
- ✅ **Dynamic Testing**: Benchmarks adapt to user-configured servers instead of hardcoded lists

### VERIFIED WORKING FEATURES
- 🧪 **Testing Integration**: Frontend fully connected to backend benchmarking
- 📊 **Live Charts**: Real-time visualization of DNS test results working
- 📈 **History Views**: Browse and compare past benchmark results functional
- ⚙️ **Custom Settings**: User-configurable DNS servers and test options active
- 🔍 **Failure Analysis**: Complete visibility into DNS test failures and diagnostics
- 🔧 **Configurable DNS Management**: Full CRUD operations for public DNS servers via Settings page
- 📡 **Dynamic Server Selection**: Benchmarks automatically use user-configured enabled servers
- 📋 **Local DNS Configuration**: Save/load local DNS servers with proper file permissions
- 🏷️ **Real-time Server Display**: Local DNS servers show as IP addresses only in benchmark results
- 🔄 **Permission Management**: Proper file access controls for configuration files
- ✅ **Expanded Domain List**: 72 comprehensive domains covering global sites, services, news, e-commerce, tech, international, educational, and financial sectors (vs original 20)
- ✅ **Enhanced UI Pagination**: Professional shadcn/ui pagination components for large result sets
- ✅ **Optimized Result Display**: Smart pagination limits for Raw Diagnostics (10 per page) and improved per-server failure badges (12 domains shown)
- ✅ **Public DNS Server Visibility**: Fixed loading state and improved user understanding of default server configuration
- ✅ **Settings Page UX**: Clear documentation of default providers (Cloudflare, Google, Quad9 enabled) with loading feedback
- ✅ **JSX Fragment Fix**: Resolved React conditional rendering syntax error for proper public DNS server display

## Project Overview

DNS Bench Web is a modern, containerized DNS benchmarking web application that transforms the original CLI tool into a full-stack web experience. The application provides real-time DNS performance testing with interactive visualizations, comprehensive result analytics, and fully configurable DNS server management through an intuitive Settings interface.

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
- **Concurrent Testing**: Tests 72+ diverse domains using Node.js dns.Resolver() with timeout controls
- **Statistics Engine**: Calculates avg, min, max, median response times and success rates
- **WebSocket Updates**: Real-time progress broadcasting to connected clients
- **Data Persistence**: SQLite database for benchmark history and results

#### Public DNS Servers Tested
Benchmarks against user-configurable public DNS providers (default configuration):
- **Cloudflare**: 1.1.1.1, 1.0.0.1 (enabled by default)
- **Google**: 8.8.8.8, 8.8.4.4 (enabled by default)
- **Quad9**: 9.9.9.9, 149.112.112.112 (enabled by default)
- **OpenDNS**: 208.67.222.222, 208.67.220.220 (disabled by default)
- **Level3**: 4.2.2.1, 4.2.2.2 (disabled by default)
- **Custom**: Users can add up to 20 total public DNS servers via Settings page

## ✅ DOCKER-FIRST DEVELOPMENT - STANDARD WORKFLOW

**IMPORTANT**: Development is now Docker-first with standard Docker practices. The application works reliably with standard `docker-compose up --build` (no workarounds needed).

### Standard Docker Development (Recommended)
```bash
# Standard Docker workflow - works for anyone familiar with Docker
# INCLUDES hot reloading via bind mounts per CEO directive
docker-compose up --build    # Build and start all services with hot reload
docker-compose down          # Stop all services
docker-compose logs          # View logs

# Alternative: Use convenience commands
make dev       # Equivalent to docker-compose up --build
make clean     # Clean shutdown and cleanup
```

### Optimized Development (Additional Options)
```bash
# Alternative development environment with additional optimizations
make dev-fast      # Uses docker-compose.dev.yml with enhanced bind mounts
make build-fast    # Build optimized development containers only
make logs-fast     # View optimized development logs
make status        # Check development environment status
```

### Development Workflow Comparison
| Method | Build Time | Code Changes | Use Case | Status |
|--------|------------|--------------|----------|---------|
| **Docker (standard)** | ~8 min initial, ~30s rebuild | ⚡ Instant hot reload | Standard development, onboarding | ✅ **RECOMMENDED** |
| **Docker (dev-fast)** | ~30s initial | ⚡ Instant hot reload | Enhanced development environment | ✅ **ALTERNATIVE** |
| **Local Node.js** | N/A | ⚡ Instant | N/A | ❌ **DISABLED** |

### Standard Docker Features (CEO Directive Compliant)
- ✅ **Fixed Build Issues**: Eliminated chown hanging problems via user-first installation pattern
- ✅ **Standard Patterns**: Follows Docker best practices for user management and layer optimization
- ✅ **Bind Mounts**: DIRECTIVE 1 - Source code bind mounted for instant changes
- ✅ **Anonymous Volumes**: DIRECTIVE 2 - node_modules preserved via `/app/node_modules`
- ✅ **Hot Reloading**: Vite (frontend) + tsx watch (backend) for instant updates
- ✅ **Layer Caching**: Dependencies cached until package.json changes
- ✅ **No Workarounds**: Works with standard `docker-compose up --build` (~8 minutes first build)
- ✅ **Reliable Rebuilds**: Consistent ~30 second rebuild times with proper layer caching
- ✅ **Auto-restart**: Containers restart automatically (restart: unless-stopped) - survive host reboots

### Dev-Fast Additional Features
- ✅ **Enhanced Bind Mounts**: More granular file mapping
- ✅ **Optimized Build Context**: .dockerignore reduces build size

### Manual Docker Commands

**Fast Development:**
```bash
# Optimized development environment
docker-compose -f docker-compose.dev.yml up -d

# Build optimized containers
docker-compose -f docker-compose.dev.yml build --parallel

# View optimized logs
docker-compose -f docker-compose.dev.yml logs -f
```

**Standard Development:**
```bash
# Start all services
docker-compose up -d

# Restart specific service
docker-compose restart client

# View service logs
docker logs dns-bench_client_1
docker logs dns-bench_server_1
```

### Docker Access Points (Running)
```bash
# Frontend (React App) - Docker Container
http://localhost:3000

# Backend API - Docker Container
http://localhost:3001/api/health
http://localhost:3001/api/dns/current

# Redis Cache - Docker Container
localhost:6379

# Check containers: docker ps
# View logs: docker logs dns-bench_server_1
```

### Testing with Playwright
```bash
# Use Playwright MCP tools for browser testing
# Navigate, take screenshots, test interactions
```

## Important Implementation Notes

### Web Application (Docker-First)
- ✅ **Docker Containers**: Frontend and backend run in Docker containers with bind mounts
- ✅ **Auto-Start**: Containers auto-start and provide instant hot reloading via bind mounts
- ✅ **File Permissions**: Config files (local-dns.json, public-dns.json) have 666 permissions for container write access
- Frontend served by Vite development server with hot reloading in Docker
- Backend uses Express.js with TypeScript and comprehensive error handling
- WebSocket connections provide sub-100ms real-time updates
- PostCSS configuration required for Tailwind CSS processing
- Docker containers share build context from `/web-app` directory

### DNS Testing Engine
- Filters out localhost DNS servers (127.x.x.x addresses) automatically
- Uses 2-second timeout for DNS queries with configurable retry attempts
- Uses Node.js native dns.Resolver() (no external DNS tools required)
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
- **Manual Host IP Configuration**: LAN access requires manual CORS configuration (auto-detection removed)
- **Real-Time Status Display**: Settings page shows current access configuration with enabled/disabled states
- **Flexible Custom Origins**: Single interface for adding specific hostnames and URLs
- **LAN Access**: Clear display of actual URLs clients use: `http://YOUR_HOST_IP:3000`

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

# Fix configuration file permissions:
chmod 664 web-app/server/local-dns.json     # Allow server write access
chmod 664 web-app/server/public-dns.json    # Allow server write access
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

## Common Issues & Troubleshooting

### Local DNS Configuration Issues

**"Failed to save local DNS configuration" (EACCES error)**
- **Root Cause**: Configuration file lacks write permissions for the Node.js server process
- **Fix**: Apply proper file permissions to the configuration file:
  ```bash
  chmod 664 web-app/server/local-dns.json
  ```
- **Prevention**: Ensure configuration files are writable by the server process during setup
- **Verification**: Test with API call: `curl -X PUT http://localhost:3001/api/settings/local-dns -H "Content-Type: application/json" -d '{"servers":[{"ip":"10.10.20.30","enabled":true}]}'`

### Real-time Display Issues

**Local DNS servers showing as "Current-{IP}" instead of IP address**
- **Root Cause**: Legacy server naming logic in frontend benchmark display
- **Fix**: Modified `getServerName` function in `/web-app/client/src/pages/benchmark.tsx:226-243`
- **Code Change**: Changed from `return \`Current-${ip}\`` to `return ip` for local DNS servers
- **Impact**: Real-time benchmark results now correctly display local DNS servers as clean IP addresses (e.g., "10.10.20.30" instead of "Current-10.10.20.30")

### ✅ REACT QUERY V5 COMPATIBILITY - COMPLETED (September 2025)
- ✅ **Fixed DNS Server Saving Issue**: Resolved React Query v5 compatibility problems in Settings page
- ✅ **Fixed Dashboard Display Issue**: Resolved React Query v5 compatibility problems in Dashboard page
- ✅ **Removed Deprecated onSuccess Callbacks**: Eliminated deprecated `onSuccess` in all `useQuery` hooks
- ✅ **Added useEffect State Management**: Implemented React Query v5 compatible state updates across app
- ✅ **Updated invalidateQueries API**: Fixed calls to use new v5 syntax `{ queryKey: ['...'] }`
- ✅ **Verified Full Functionality**: DNS server additions save correctly and display properly on dashboard

### Technical Details of React Query Fix
**Files Modified**:
- `/web-app/client/src/pages/settings.tsx:62-127, 105-134, 205, 226, 146` (Settings page fix)
- `/web-app/client/src/pages/dashboard.tsx:60-74` (Dashboard display fix)

**Root Cause**: React Query v5 removed `onSuccess` callbacks from `useQuery` hooks
**Solution**:
- Replaced `onSuccess` callbacks with `useEffect` hooks that respond to data changes
- Updated `queryClient.invalidateQueries(['key'])` to `queryClient.invalidateQueries({ queryKey: ['key'] })`
- State updates now properly trigger when query data changes
- Applied consistent pattern across both Settings and Dashboard components

### Session 2 Fix (Dashboard Display)
**Issue**: 6 DNS servers saved correctly but not displaying on Dashboard
**Root Cause**: Dashboard was using same deprecated `onSuccess` pattern as Settings page
**Files Modified**: `/web-app/client/src/pages/dashboard.tsx:60-74`
**Pattern Applied**: Same useEffect-based state sync as Settings page fix

### ✅ BACKEND PROCESS MANAGEMENT - COMPLETED (September 2025)
- ✅ **Fixed Benchmark/History Connection Issues**: Resolved backend process management problems
- ✅ **Identified Root Cause**: Old backend processes holding ports but not serving correct API routes
- ✅ **Process Cleanup Solution**: Clean restart protocol using `pkill -f tsx && pkill -f vite` then start development servers manually
- ✅ **Prevention Protocol**: Always clean restart development servers to prevent port conflicts
- ✅ **Verification Commands**: `lsof -i :3000` (frontend), `lsof -i :3001` (backend), `curl http://localhost:3001/api/health`

### Technical Details of Backend Process Fix
**Issue**: Multiple backend processes running simultaneously:
- Old process (wrong directory context): Not serving API routes correctly
- New process (correct directory): Started correctly but port conflicts

**Root Cause**:
- Startup scripts work correctly when used properly
- Problem was lingering processes from previous sessions holding ports
- Old processes from wrong working directory couldn't serve API routes

**Solution Pattern**:
1. Kill all related processes: `pkill -f tsx && pkill -f vite`
2. Start development servers manually in correct directories
3. Verify services: Check ports and health endpoints

### Missing Features (User Reports)

**"My per-server analysis is gone from the results page"**
- **Status**: Feature is working correctly and available
- **Location**: Results page → "Server Analysis" tab
- **Features**: Collapsible server entries with detailed domain-by-domain breakdown
- **Verification**: Check the tabbed interface: Overview, Failures, Server Analysis, Raw Diagnostics