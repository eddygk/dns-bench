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

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/eddygk/dns-bench.git
cd dns-bench

# Start the application
make dev

# Or using docker-compose directly
docker-compose up -d
```

Access the application at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/health

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

## 📋 Requirements

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+
- 1GB free RAM
- Ports 3000, 3001, and 6379 available

### For Manual Installation
- Node.js 18+ with npm
- SQLite3
- Redis (optional, for caching)
- No external DNS tools required (uses Node.js native DNS resolver)

## 🔄 Development

### Start Development Environment

```bash
# Using Make
make dev       # Start all services
make logs      # View logs
make clean     # Stop and clean
make build     # Rebuild containers

# Manual commands
docker-compose up -d
docker logs -f dns-bench-client-1
docker logs -f dns-bench-server-1
```

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

## 🐛 Troubleshooting

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

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
make build

# Restart services
make dev
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

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/eddygk/dns-bench/issues)
- **Discussions**: [GitHub Discussions](https://github.com/eddygk/dns-bench/discussions)

---

**⚡ Quick Start:** `make dev` to launch the web application!