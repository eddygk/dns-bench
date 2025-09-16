# DNS Bench Web

A modern web-based DNS benchmarking application that tests and compares DNS server performance. Features a React frontend with real-time updates and comprehensive performance analytics.

![DNS Bench Web](https://img.shields.io/badge/Platform-Linux-blue) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Docker](https://img.shields.io/badge/Docker-Ready-green)

## 🎯 Features

- **🌐 Web-Based Interface** - Modern React UI with shadcn/ui components
- **⚙️ Manual DNS Configuration** - Configure your local DNS servers through the dashboard (with auto-detection fallback)
- **⚡ Performance Benchmarking** - Tests response times across 20 diverse domains
- **🌍 Public DNS Comparison** - Compare against 10 popular public DNS providers
- **📊 Real-Time Updates** - Live progress tracking via Socket.IO during benchmarks
- **📈 Statistical Analysis** - Avg, min, max, median response times and success rates
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
Navigate to **Settings** to configure your local DNS servers:
1. Enter Primary DNS Server IP
2. Enter Secondary DNS Server IP (optional)
3. Click **Save Settings**
4. Your configured DNS will be used in benchmarks

**Note**: If no DNS servers are configured, the system will attempt auto-detection from:
- `/etc/resolv.conf`
- systemd-resolved
- NetworkManager

### Benchmark Page
- Start comprehensive DNS tests
- Real-time progress updates via Socket.IO
- Live activity log showing current tests
- Detailed results with performance charts

### Results Analysis
- Performance comparison charts (using Recharts)
- Statistical breakdown per DNS server
- Success rate analysis
- Domain-specific performance metrics

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

## 🌐 Tested DNS Providers

| Provider | Primary | Secondary | Features |
|----------|---------|-----------|----------|
| **Your Local DNS** | User configured | User configured | LAN/ISP servers |
| **Cloudflare** | 1.1.1.1 | 1.0.0.1 | Fast, privacy-focused |
| **Google** | 8.8.8.8 | 8.8.4.4 | Reliable, widely used |
| **Quad9** | 9.9.9.9 | 149.112.112.112 | Security, malware blocking |
| **OpenDNS** | 208.67.222.222 | 208.67.220.220 | Content filtering |
| **Level3** | 4.2.2.1 | 4.2.2.2 | ISP-grade reliability |

## 📋 Requirements

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+
- 1GB free RAM
- Ports 3000, 3001, and 6379 available

### For Manual Installation
- Node.js 18+ with npm
- Linux with `dig` command (bind-tools/dnsutils)
- SQLite3
- Redis (optional, for caching)

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
  - DNS testing via `dig` command

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
HOST_IP=<your-lan-ip>  # For LAN access
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

- Ensure `dig` command is available in backend container
- Check network connectivity: `docker exec dns-bench-server-1 ping 8.8.8.8`
- Verify DNS server IPs in Settings are correct
- Review backend logs: `docker logs dns-bench-server-1`

### Common Issues

**"Could not detect DNS servers"**
- Configure DNS servers manually in Settings
- Check if running in Docker (may not have access to host DNS)
- Verify network permissions

**Real-time updates not working**
- Check WebSocket connection in browser console
- Ensure Socket.IO is connecting to correct URL
- Verify CORS settings allow your origin

## 📈 Performance Tips

1. **Configure local DNS first** - Set your actual LAN DNS servers in Settings
2. **Run multiple tests** - Performance varies by time of day and network load
3. **Compare results** - Look for consistency across multiple test runs
4. **Consider latency** - Geographically closer servers typically perform better
5. **Check success rates** - Reliability is as important as speed

## 🔄 Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
make build

# Restart services
make dev
```

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- [ ] Enhanced result visualization with more chart types
- [ ] Add more DNS providers (Comodo, Norton, etc.)
- [ ] Implement result export (CSV/JSON)
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

- Inspired by [Steve Gibson's DNS Bench](https://www.grc.com/dns/benchmark.htm)
- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Uses Docker for containerization
- React + TypeScript for modern web development
- Socket.IO for real-time communications

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/eddygk/dns-bench/issues)
- **Discussions**: [GitHub Discussions](https://github.com/eddygk/dns-bench/discussions)

---

**⚡ Quick Start:** `make dev` to launch the web application!