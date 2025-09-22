# DNS Bench Web

A modern web-based DNS benchmarking application that tests and compares DNS server performance. Features a React frontend with real-time updates and comprehensive performance analytics.

![DNS Bench Web](https://img.shields.io/badge/Platform-Linux-blue) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Docker](https://img.shields.io/badge/Docker-Ready-green)

## 🎯 Features

- **🌐 Web-Based Interface** - Modern React UI with shadcn/ui components
- **⚙️ Configurable DNS Servers** - Manage both local and public DNS servers through intuitive Settings interface
- **⚡ Performance Benchmarking** - Tests response times across 72+ diverse domains
- **🌍 Customizable Public DNS** - Add, edit, enable/disable public DNS providers (default: Cloudflare, Google, Quad9)
- **📊 Real-Time Updates** - Live progress tracking via Socket.IO during benchmarks
- **📈 Enhanced Failure Diagnostics** - Tabbed interface with repeat offender detection, pagination, and detailed error analysis
- **📋 Statistical Analysis** - Avg, min, max, median response times and success rates
- **💾 History Tracking** - SQLite database stores benchmark results
- **🐳 Docker Ready** - Multi-container orchestration for easy deployment
- **🔒 Security First** - Rate limiting, CORS configuration, input validation

## 🚀 Quick Start

> **New to DNS Bench?** Choose your setup method below. **Production Deployment** is recommended for regular use, **Development** is for code contributions.

### Prerequisites

**Required for all setups:**
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+
- 1GB free RAM
- Available ports: 80 (production) or 3000/3001 (development), plus 6379

**Quick prerequisite check:**
```bash
docker --version          # Should show 20.10+
docker-compose --version  # Should show 2.0+
```

### Production Deployment (Recommended)

**Perfect for: Testing DNS performance, regular use, demos**

**One-command production deployment:**

```bash
# Clone the repository
git clone https://github.com/eddygk/dns-bench.git
cd dns-bench

# Deploy to production
./deploy.sh
```

The deployment script will:
- ✅ Check Docker prerequisites
- ✅ Set up environment configuration
- ✅ Auto-detect host IP for CORS
- ✅ Build optimized production images
- ✅ Start services with health checks
- ✅ Display access URLs and management commands

**Production Features:**
- 🔒 **Security**: Non-root containers, health checks, proper logging
- 🚀 **Performance**: Multi-stage builds, optimized images, caching
- 📊 **Monitoring**: Health checks, structured logging, service status
- ⚙️ **Configuration**: Environment-based config, persistent volumes
- 🔄 **Management**: Easy updates, restarts, and maintenance

**Quick Commands:**
```bash
./deploy.sh          # Deploy/start services
./deploy.sh status   # Check service health
./deploy.sh logs     # View service logs
./deploy.sh update   # Update to latest version
./deploy.sh stop     # Stop all services
./deploy.sh cleanup  # Remove everything
```

**✅ Success! Access your deployment:**
- **Web Interface**: http://YOUR_IP:80 (replace YOUR_IP with your server's IP)
- **API Health Check**: http://YOUR_IP:3001/api/health
- **Management**: Use `./deploy.sh status` to check health, `./deploy.sh logs` to view logs

**🎯 First Steps After Deployment:**
1. Open the web interface in your browser
2. Go to **Settings** to configure your local DNS servers
3. Run a **Quick Benchmark** to test DNS performance
4. Check **History** to view past results

### Development Deployment

**Perfect for: Contributing code, customizing features, local development**

**Fast Development Workflow (Recommended):**
```bash
# Clone the repository
git clone https://github.com/eddygk/dns-bench.git
cd dns-bench

# Start optimized development environment with instant hot reloading
make dev-fast

# Alternative: Standard development environment
make dev

# Or using docker-compose directly
docker-compose up -d
```

**Fast Development Features:**
- ⚡ **Instant Hot Reloading**: Code changes appear in <100ms
- 🔨 **Optimized Layer Caching**: Dependencies only rebuild when package.json changes
- 📁 **Minimal Build Context**: .dockerignore reduces build context significantly
- 🚀 **One-Command Setup**: `make dev-fast` handles everything

**✅ Success! Access the development environment:**
- **Web Interface**: http://localhost:3000
- **API Health Check**: http://localhost:3001/api/health
- **Live Reloading**: Edit code and see changes instantly!

**Development Commands:**
```bash
make dev-fast      # Start optimized development (recommended)
make build-fast    # Build optimized development containers
make logs-fast     # View development logs
make status        # Check environment status
make clean         # Clean up all containers and volumes
```

### Manual Installation

```bash
# Install dependencies for frontend
cd web-app/client
npm install

# Install dependencies for backend
cd ../server
npm install

# Start both services
npm run dev  # In both directories
```

## 📊 Web Interface

### Dashboard
- View current DNS configuration
- Quick access to benchmark and settings
- Real-time system status

### DNS Configuration
Navigate to **Settings** to configure your DNS servers:

#### Local DNS Servers
1. Enter Primary DNS Server IP (e.g., 10.10.20.30)
2. Enter Secondary DNS Server IP (optional)
3. Click **Save Settings**
4. Your configured DNS will be used in benchmarks

**Note**: If no local DNS servers are configured, the system will attempt auto-detection from:
- `/etc/resolv.conf`
- systemd-resolved
- NetworkManager

#### Public DNS Servers
1. View pre-configured popular providers (Cloudflare, Google, Quad9, OpenDNS, Level3)
2. Enable/disable individual servers using toggle switches
3. Add custom DNS servers with **Add Custom DNS Server** button
4. Configure server names, IPs, and providers
5. Click **Save Public DNS Configuration**

**Features**:
- ✅ Enable/disable servers without deleting them
- ✅ Add up to 20 total public DNS servers
- ✅ Built-in servers cannot be deleted but can be disabled
- ✅ Custom servers can be added and removed
- ✅ Benchmarks automatically adapt to your configuration

### Benchmark Page
- Start comprehensive DNS tests
- Real-time progress updates via Socket.IO
- Live activity log showing current tests
- Detailed results with performance charts

### Enhanced Results Analysis
- **Tabbed Interface**: Overview, Failures, Server Analysis, Raw Diagnostics
- **Performance comparison charts** (using Recharts)
- **Failure diagnostics**: Repeat offender detection and detailed error analysis
- **Server breakdown**: Per-server failure analysis showing problematic DNS servers
- **Per-Server Domain Analysis**: Collapsible server entries showing detailed domain-by-domain test results
- **Smart recommendations**: Actionable insights based on performance data
- **Paginated Raw diagnostics**: Professional pagination for large result sets using shadcn/ui components
- **Statistical breakdown** per DNS server with success rates
- **Comprehensive domain coverage**: Tests 72+ domains across global sites, services, news, e-commerce, technology, international, educational, and financial sectors

### History
- Browse past benchmark results
- Compare performance over time
- Filter and search capabilities
- Export results for analysis

## 🛠️ Architecture

```
dns-bench/
├── web-app/
│   ├── client/          # React frontend
│   │   ├── src/
│   │   │   ├── pages/   # Dashboard, Benchmark, Settings, Results, History
│   │   │   ├── components/  # shadcn/ui components
│   │   │   └── lib/     # API client, utilities
│   │   └── Dockerfile
│   │
│   ├── server/          # Express backend
│   │   ├── src/
│   │   │   ├── services/  # DNS testing, settings, database
│   │   │   └── index.ts  # Socket.IO server & API routes
│   │   └── Dockerfile
│   │
│   └── shared/          # Shared TypeScript types
│
├── docker-compose.yml   # Container orchestration
└── Makefile            # Development commands
```

## 🔧 Configuration

### Local DNS Settings

The application uses **manual DNS configuration** as the primary method:

1. Navigate to **Settings** in the web interface
2. Enter your local DNS server IPs:
   - Primary DNS (e.g., 10.10.20.30)
   - Secondary DNS (e.g., 10.10.20.31)
3. Click **Save Settings**
4. Run benchmarks to compare against public DNS

Configuration is stored in `local-dns.json` on the server.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/dns/current` | GET | Get current DNS servers (configured or auto-detected) |
| `/api/settings/local-dns` | GET | Get local DNS configuration |
| `/api/settings/local-dns` | PUT | Update local DNS servers |
| `/api/settings/public-dns` | GET | Get public DNS server configuration |
| `/api/settings/public-dns` | PUT | Update public DNS servers |
| `/api/benchmark/start` | POST | Start DNS benchmark |
| `/api/results` | GET | Get all benchmark results |
| `/api/results/:testId` | GET | Get specific test results |
| `/api/settings/cors` | GET/PUT | CORS configuration |

### Socket.IO Events

Real-time updates during benchmarking:
- `benchmark:progress` - Current test progress and server being tested
- `benchmark:complete` - Final results
- `benchmark:error` - Error notifications
- `benchmark:domain` - Individual domain test results

## 🌐 Configurable DNS Providers

### Default Public DNS Servers
| Provider | Primary | Secondary | Default Status | Features |
|----------|---------|-----------|----------------|----------|
| **Cloudflare** | 1.1.1.1 | 1.0.0.1 | ✅ Enabled | Fast, privacy-focused |
| **Google** | 8.8.8.8 | 8.8.4.4 | ✅ Enabled | Reliable, widely used |
| **Quad9** | 9.9.9.9 | 149.112.112.112 | ✅ Enabled | Security, malware blocking |
| **OpenDNS** | 208.67.222.222 | 208.67.220.220 | ❌ Disabled | Content filtering |
| **Level3** | 4.2.2.1 | 4.2.2.2 | ❌ Disabled | ISP-grade reliability |

### User-Configurable Options
- **Local DNS**: Configure your LAN/ISP DNS servers manually
- **Custom Public DNS**: Add any additional public DNS providers
- **Enable/Disable**: Toggle any server without deleting configuration
- **Dynamic Testing**: Benchmarks adapt to your enabled server selection

## 📋 Troubleshooting Setup

### Common Issues

**"Port already in use" errors:**
```bash
# Check what's using the ports
lsof -i :80 -i :3000 -i :3001 -i :6379

# Stop conflicting services
sudo systemctl stop nginx    # If using port 80
sudo systemctl stop apache2  # If using port 80
```

**Docker permission issues:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in, or restart terminal
```

**Services not starting:**
```bash
# Check Docker is running
sudo systemctl status docker

# View detailed logs
docker-compose logs     # For development
./deploy.sh logs        # For production
```

### System Requirements

**Minimum Requirements:**
- Docker 20.10+
- Docker Compose 2.0+
- 1GB free RAM
- 2GB free disk space
- Network access for DNS testing

**Optional for Manual Installation:**
- Node.js 18+ with npm
- SQLite3
- Redis (for caching)
- No external DNS tools required (uses Node.js native DNS resolver)

## 🔄 Development

### Start Development Environment

**Fast Development (Recommended):**
```bash
# Optimized development with instant hot reloading
make dev-fast      # Start optimized development environment
make build-fast    # Build optimized containers only
make logs-fast     # View optimized development logs
make status        # Check development environment status

# Quick troubleshooting
make clean && make dev-fast  # Clean restart for issues
```

**Standard Development:**
```bash
# Traditional development workflow
make dev       # Start all services
make logs      # View logs
make clean     # Stop and clean
make build     # Rebuild containers

# Manual commands
docker-compose up -d
docker logs -f dns-bench-client-1
docker logs -f dns-bench-server-1
```

**Development Workflow Comparison:**
| Command | Speed | Use Case |
|---------|-------|----------|
| `make dev-fast` | ⚡ Instant | Active development with hot reloading |
| `make dev` | 🐌 2-3 min | Standard Docker development |
| Manual commands | 🐌 Variable | Debugging specific containers |

### Technology Stack

- **Frontend**:
  - React 18 + TypeScript
  - Vite for build tooling
  - Tailwind CSS + shadcn/ui for UI
  - Socket.IO client for real-time updates
  - Zustand for state management
  - React Query for data fetching
  - Recharts for data visualization

- **Backend**:
  - Express.js + TypeScript
  - Socket.IO for WebSocket connections
  - SQLite for data persistence
  - Pino for logging
  - DNS testing via Node.js native `dns.Resolver()`

- **Infrastructure**:
  - Docker multi-container setup
  - Redis for caching
  - Environment-based configuration

### Environment Variables

```bash
# Frontend (.env)
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Backend (.env)
PORT=3001
NODE_ENV=development
DB_PATH=/app/data/dns-bench.db
CORS_ORIGIN=http://localhost:3000
HOST_IP=<your-lan-ip>  # Manual configuration only (auto-detection removed)
```

## 🐳 Production Deployment

### Docker Files Overview

The production deployment uses optimized Docker configurations:

```
dns-bench/
├── docker-compose.prod.yml     # Production compose file
├── docker-compose.yml          # Development compose file
├── deploy.sh                   # Production deployment script
├── .env.production            # Production environment template
├── redis.conf                 # Redis production configuration
└── web-app/
    ├── client/Dockerfile      # Multi-stage React build
    └── server/Dockerfile      # Multi-stage Node.js build
```

### Production Features

**🔒 Security:**
- Non-root containers (nodejs user UID 1001)
- Build verification at each stage
- Minimal attack surface (Alpine Linux)
- Health check endpoints
- Resource isolation

**🚀 Performance:**
- Multi-stage builds for minimal image size
- Optimized layer caching with mount cache
- Production-only dependencies
- Gzip compression (Nginx)
- Redis caching layer

**📊 Monitoring:**
- Container health checks (30s intervals)
- Structured JSON logging
- Log rotation (10MB max, 3 files)
- Service dependency health verification

**⚙️ Configuration:**
- Environment-based configuration
- Persistent volumes for data/config
- Configurable resource limits
- Auto-IP detection for CORS

### Production Environment Variables

Copy `.env.production` to `.env` and customize:

```bash
# Application
NODE_ENV=production
FRONTEND_PORT=80
BACKEND_PORT=3001
DOMAIN=yourdomain.com
CORS_ORIGIN=http://yourdomain.com

# Performance
MAX_CONCURRENT_BENCHMARKS=3
BENCHMARK_TIMEOUT=30000
LOG_LEVEL=info

# Data Storage
DATA_PATH=./data
CONFIG_PATH=./config

# Optional: Redis authentication
# REDIS_PASSWORD=your_secure_password

# Optional: SSL termination
# ENABLE_SSL=true
# SSL_CERT_PATH=/path/to/cert.pem
# SSL_KEY_PATH=/path/to/key.pem
```

### Deployment Commands

```bash
# Production deployment
./deploy.sh                    # Full production deployment
./deploy.sh deploy            # Same as above
./deploy.sh start             # Same as above

# Management
./deploy.sh status            # Service health status
./deploy.sh logs              # View all service logs
./deploy.sh restart           # Restart all services

# Updates
./deploy.sh update            # Update and restart with latest code
git pull && ./deploy.sh update  # Manual update

# Maintenance
./deploy.sh stop              # Stop all services
./deploy.sh cleanup           # Remove containers, images, volumes

# Help
./deploy.sh help              # Show all available commands
```

### Manual Production Deployment

If you prefer manual control over the deployment:

```bash
# Using the production compose file directly
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     DNS Bench Production                │
├─────────────────────────────────────────────────────────┤
│  Frontend (Nginx)     │  Backend (Node.js)   │  Redis   │
│  ├─ React App (built) │  ├─ Express API      │  Cache   │
│  ├─ Static Assets     │  ├─ Socket.IO        │  Session │
│  ├─ Gzip Compression  │  ├─ DNS Testing      │  Storage │
│  └─ Health Check      │  └─ Health Check     │  Jobs    │
├─────────────────────────────────────────────────────────┤
│                    Docker Network                       │
│                  172.20.0.0/16                         │
├─────────────────────────────────────────────────────────┤
│              Persistent Volumes                         │
│  ├─ ./data (SQLite, logs)                              │
│  ├─ ./config (DNS server configs)                      │
│  └─ redis_data (Redis persistence)                     │
└─────────────────────────────────────────────────────────┘
```

### Reverse Proxy Setup (Optional)

For production deployments behind a reverse proxy:

**Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Traefik:** Labels already included in `docker-compose.prod.yml`

### Health Monitoring

All services include health checks:

```bash
# Check overall deployment health
./deploy.sh status

# Individual service health
docker inspect dns-bench-frontend --format='{{.State.Health.Status}}'
docker inspect dns-bench-backend --format='{{.State.Health.Status}}'
docker inspect dns-bench-redis --format='{{.State.Health.Status}}'

# Health check endpoints
curl http://localhost:80/        # Frontend health
curl http://localhost:3001/api/health  # Backend health
```

## 🐛 Troubleshooting

### Development Server Issues

**Backend startup problems or API connection refused errors:**
- **Root Cause**: Old backend processes may be running from wrong directory or holding ports
- **Solution**: Clean restart all processes:
  ```bash
  # Kill all existing processes
  pkill -f tsx
  pkill -f vite

  # Then start development servers
  cd web-app/server && npm run dev &
  cd web-app/client && npm run dev
  ```
- **Verification**: Check both services are running correctly:
  ```bash
  lsof -i :3000  # Frontend should be running
  lsof -i :3001  # Backend should be running
  curl http://localhost:3001/api/health  # Should return {"status":"ok"}
  ```

### Container Issues

```bash
# Rebuild containers
make build

# Check container status
docker ps

# View specific logs
docker logs dns-bench-server-1
docker logs dns-bench-client-1
```

### Network Access

If accessing from another device on your network:
1. Set `HOST_IP` in `.env` to your machine's LAN IP
2. Check Settings page for LAN access URLs
3. Ensure firewall allows ports 3000 and 3001
4. Access via `http://<host-ip>:3000`

### DNS Testing Issues

- DNS resolution uses Node.js native resolver (no external tools needed)
- Check network connectivity: `docker exec dns-bench-server-1 ping 8.8.8.8`
- Verify DNS server IPs in Settings are correct
- Review backend logs: `docker logs dns-bench-server-1`

### Common Issues

**"Could not detect DNS servers"**
- Configure local DNS servers manually in Settings → Local DNS Servers
- Check if running in Docker (may not have access to host DNS)
- Verify network permissions

**"No enabled public DNS servers"**
- Go to Settings → Public DNS Servers and enable at least one server
- Default configuration includes Cloudflare, Google, and Quad9 enabled
- Verify your configuration and save changes

**"Failed to save local DNS configuration" (EACCES error)**
- Fix file permissions: `chmod 664 web-app/server/local-dns.json`
- Ensure the server process has write access to configuration files
- Check server logs for permission errors

**"Local DNS servers not saving when added via Settings page"**
- ✅ **FIXED**: React Query v5 compatibility issue resolved
- Issue was deprecated `onSuccess` callbacks in useQuery hooks
- Solution: Replaced with `useEffect` hooks for state updates
- Updated `invalidateQueries` calls to use v5 API: `{ queryKey: ['...'] }`

**"Local DNS servers not appearing on Dashboard after saving"**
- ✅ **FIXED**: Same React Query v5 compatibility issue in dashboard
- Fixed deprecated `onSuccess` callback in dashboard.tsx useQuery hook
- Applied consistent `useEffect` pattern for state synchronization
- Dashboard now properly displays all configured local DNS servers

**"Benchmarks not running / History page connection refused"**
- ✅ **FIXED**: Backend process management issue resolved
- Issue: Old backend processes holding ports but not serving correct routes
- Root cause: Process started from wrong directory or port conflicts
- Solution: Clean process restart using `pkill -f tsx && pkill -f vite` then start development servers manually
- Prevention: Always restart development servers cleanly to avoid port conflicts

**Real-time updates not working**
- Check WebSocket connection in browser console
- Ensure Socket.IO is connecting to correct URL
- Verify CORS settings allow your origin

**Local DNS servers show as "Current-IP" in real-time results**
- This has been fixed - local DNS servers now display as IP addresses only
- Restart the application if you still see the old format

## 📈 Performance Tips

1. **Configure local DNS first** - Set your actual LAN DNS servers in Settings → Local DNS Servers
2. **Customize public DNS servers** - Enable only the providers you want to test in Settings → Public DNS Servers
3. **Run multiple tests** - Performance varies by time of day and network load
4. **Compare results** - Look for consistency across multiple test runs
5. **Consider latency** - Geographically closer servers typically perform better
6. **Check success rates** - Reliability is as important as speed
7. **Use quick tests** - Enable 3-4 key DNS providers for faster benchmarking

## 🔄 Updating

### Production Updates
```bash
# Update to latest version (recommended)
./deploy.sh update

# Manual update process
git pull origin main
./deploy.sh
```

### Development Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart fast development
make clean && make dev-fast

# Or standard development
make build && make dev
```

## 🧪 Testing

A comprehensive testing implementation guide is available in [`docs/TESTING_IMPLEMENTATION_BRIEF.md`](docs/TESTING_IMPLEMENTATION_BRIEF.md). The testing strategy includes:

- **Unit Tests**: Real DNS testing with Node.js `dns.Resolver()` against Google DNS
- **Integration Tests**: Full API and database testing
- **E2E Tests**: Playwright automation for critical user journeys
- **Performance Tests**: Load testing and DNS benchmarking validation
- **CI/CD**: GitHub Actions pipeline with fast PR testing (<8 minutes)

The guide provides complete implementation details, code examples, and CI configuration for another developer to implement comprehensive test coverage.

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- [x] ~~Enhanced result visualization with more chart types~~ ✅ **COMPLETED**
- [x] ~~Implement result export (CSV/JSON)~~ ✅ **COMPLETED**
- [x] ~~Enhanced failure diagnostics and analysis~~ ✅ **COMPLETED**
- [ ] Implement 3-query methodology (cached/uncached/dotcom testing)
- [ ] Add statistical analysis (min/max/standard deviation per query type)
- [ ] Add more DNS providers (Comodo, Norton, etc.)
- [ ] Add scheduling for automated tests
- [ ] Improve mobile responsive design
- [ ] Add DNS-over-HTTPS (DoH) testing
- [ ] Implement DNS-over-TLS (DoT) support
- [ ] Add latency heatmaps
- [ ] Create REST API documentation

## Legacy CLI Tool

The original Python-based CLI tool (`dns_bench_linux.py`) is still included for command-line usage:

```bash
# Install
sudo cp dns_bench_linux.py /usr/local/bin/dns-bench
sudo chmod +x /usr/local/bin/dns-bench

# Run
dns-bench --top3  # Quick test against top 3 DNS providers
dns-bench --verbose  # Full test with detailed output
```

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Inspired by industry-standard DNS benchmarking methodologies
- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Uses Docker for containerization
- React + TypeScript for modern web development
- Socket.IO for real-time communications

## 🆘 Need Help?

### Quick Solutions
- **Setup Issues**: Check the [Troubleshooting Setup](#-troubleshooting-setup) section above
- **First Time**: Follow the [Quick Start](#-quick-start) guide step by step
- **Development**: Use `make dev-fast` for instant hot reloading

### Get Support
- **🐛 Found a Bug?** [Report it on GitHub Issues](https://github.com/eddygk/dns-bench/issues)
- **💬 Have Questions?** [Join GitHub Discussions](https://github.com/eddygk/dns-bench/discussions)
- **📖 Need Docs?** Everything is documented in this README

### Success Checklist
✅ Docker and Docker Compose installed
✅ Ports 80 (or 3000/3001) available
✅ Run `./deploy.sh` (production) or `make dev-fast` (development)
✅ Access web interface in browser
✅ Configure DNS servers in Settings
✅ Run your first benchmark!

---

**🚀 Ready to test DNS performance?** Choose [Production](#production-deployment-recommended) for regular use or [Development](#development-deployment) to contribute!