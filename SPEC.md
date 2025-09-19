# DNS Bench Web Application Specification

## Executive Summary
Transform the DNS Bench Linux CLI tool into a modern, React-based web application with real-time benchmarking capabilities, interactive visualizations, and a professional UI using the shadcn/ui design system.

## Project Goals
1. **User-Friendly Interface**: Replace CLI with intuitive web UI
2. **Real-Time Monitoring**: Live updates during benchmarking
3. **Visual Analytics**: Charts and graphs for performance comparison
4. **Cross-Platform**: Works on any device with a web browser
5. **Enterprise Ready**: Support for multiple concurrent tests and result history

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **State Management**: React Query (TanStack Query) + useState
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS with CSS Variables
- **Charts**: Recharts for data visualization
- **Data Tables**: TanStack Table for results display
- **Icons**: Lucide React
- **Notifications**: Sonner (react-hot-toast alternative)
- **Real-time Updates**: WebSocket via Socket.io
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

### Backend Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js with TypeScript
- **DNS Testing**: Node.js native dns.Resolver() API
- **WebSocket**: Socket.io server
- **Concurrency**: Promise-based concurrent DNS resolution
- **Database**: SQLite for storing test history (optional PostgreSQL for production)
- **API Documentation**: OpenAPI/Swagger

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Reverse Proxy**: Nginx for production
- **Process Manager**: PM2 for Node.js
- **Monitoring**: Optional Prometheus/Grafana integration

## User Interface Design

### 1. Dashboard Page (shadcn/ui Implementation)

**IMPLEMENTED**: Modern, clean dashboard using shadcn/ui components with:

- **Header Navigation**: "DNS Bench" branding with tabbed navigation (Dashboard, Benchmark, History, Settings) and theme toggle
- **DNS Configuration Card**: Displays current DNS servers (10.10.20.10, 10.10.20.20, 10.10.20.30) with status indicators and "Edit DNS Servers" button
- **Quick Actions Grid**: Four action buttons in 2x2 layout:
  - "Quick Test" (blue primary button) - Top 3 + Current
  - "Full Benchmark" - All Public DNS
  - "View History" - Past Results
  - "Custom Test" - Choose Servers
- **Recent Results Section**: Placeholder with "No benchmark results yet" and "Run Your First Test" button
- **Responsive Design**: Clean cards with proper spacing, shadows, and modern typography
- **Theme Support**: Light/dark mode toggle with proper CSS variables

### 2. Live Benchmarking View (shadcn/ui Design)
```
┌─────────────────────────────────────────────────────────────┐
│ ⏱️ Benchmark in Progress                    [❌ Cancel Test] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ╭─────────────────────────────────────────────────────────╮ │
│ │ 🧪 Testing 6 DNS Servers • 24 Domains                  │ │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 75% Complete (18/24)         │ │
│ │ Estimated time remaining: 12 seconds                   │ │
│ ╰─────────────────────────────────────────────────────────╯ │
│                                                              │
│ ╭─────────────────────────────────────────────────────────╮ │
│ │ 📊 Real-Time Response Times                             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Cloudflare      ▓▓▓▓▓▓▓▓░░░░░░░░ 8.2ms    ✅ 18/18   │ │
│ │ 10.10.20.30     ▓▓▓▓▓▓▓▓▓▓▓░░░░░ 13.7ms   ✅ 16/18   │ │
│ │ 10.10.20.10     ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 15.4ms   ✅ 18/18   │ │
│ │ Quad9           ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░ 14.1ms   ✅ 17/18   │ │
│ │ 10.10.20.20     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 18.2ms   🟡 15/18   │ │
│ │ Google          ▓▓▓▓▓▓▓▓▓▓▓░░░░░ 11.3ms   🔄 Testing  │ │
│ ╰─────────────────────────────────────────────────────────╯ │
│                                                              │
│ ╭─────────────────────────────────────────────────────────╮ │
│ │ 🎯 Current Test Details                                 │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Domain: github.com                                      │ │
│ │ Testing: Google (8.8.8.8)                             │ │
│ │ Status: 🔄 Resolving...                                │ │
│ │ Elapsed: 124ms                                         │ │
│ ╰─────────────────────────────────────────────────────────╯ │
│                                                              │
│ ╭─────────────────────────────────────────────────────────╮ │
│ │ 📜 Activity Log                              [Clear Log] │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ✅ github.com @ Cloudflare: 7.8ms                      │ │
│ │ ✅ stackoverflow.com @ 10.10.20.10: 16.2ms             │ │
│ │ ❌ baidu.com @ 10.10.20.20: Timeout                    │ │
│ │ ✅ netflix.com @ Quad9: 13.4ms                         │ │
│ ╰─────────────────────────────────────────────────────────╯ │
└─────────────────────────────────────────────────────────────┘
```

### 3. Results & Analytics Page
```
┌─────────────────────────────────────────────────────────────┐
│  Benchmark Results - January 15, 2024 14:45                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Performance Chart                    [Line] [Bar]    │  │
│  │                                                       │  │
│  │     Response Time (ms)                               │  │
│  │  40 ┤                                                │  │
│  │  30 ┤        ╱╲                                     │  │
│  │  20 ┤   ╱╲  ╱  ╲    ╱╲                             │  │
│  │  10 ┤  ╱  ╲╱    ╲__╱  ╲___                        │  │
│  │   0 └────────────────────────────────              │  │
│  │       CF   G8   Q9   DNS1  DNS2  DNS3             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Detailed Results Table                   [Export]    │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Rank │ Server      │ Avg    │ Min  │ Max   │ Success│  │
│  │ 1    │ Cloudflare  │ 8.2ms  │ 5ms  │ 15ms  │ 100%   │  │
│  │ 2    │ 10.10.20.10 │ 15.4ms │ 7ms  │ 23ms  │ 100%   │  │
│  │ 3    │ Google      │ 18.3ms │ 12ms │ 35ms  │ 100%   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. DNS Detection & Configuration
- **Auto-detect** current system DNS servers
- **Manual entry** for custom DNS servers
- **Server profiles** for quick switching
- **IPv4 and IPv6** support

### 2. Benchmarking Options
- **Quick Test**: Top 3 public DNS + current
- **Full Test**: All public DNS providers
- **Custom Test**: User-defined server list
- **Scheduled Tests**: Automated periodic testing

### 3. Test Customization
- **Domain Selection**: Choose test domains
- **Query Types**: A, AAAA, MX, TXT records
- **Concurrent Queries**: Adjustable parallelism
- **Timeout Settings**: Configurable per test
- **Retry Logic**: Automatic retry on failure

### 4. Real-Time Features
- **Live Progress**: WebSocket updates
- **Streaming Results**: See results as they complete
- **Cancel Capability**: Stop tests mid-execution
- **Performance Metrics**: CPU/Memory usage display

### 5. Analytics & Reporting
- **Visual Charts**: Response time graphs
- **Success Rate**: Reliability metrics
- **Comparison Matrix**: Side-by-side analysis
- **Historical Trends**: Performance over time
- **Export Options**: CSV, JSON, PDF reports

### 6. Advanced Features
- **Batch Testing**: Multiple server groups
- **Geographic Testing**: Test from different regions (future)
- **DNSSEC Validation**: Security checks
- **Cache Analysis**: Cached vs uncached queries
- **Failure Diagnostics**: Detailed error analysis

## API Specification - ✅ IMPLEMENTED

### REST Endpoints

```typescript
// Health Check - ✅ WORKING
GET /api/health
Response: { status: "ok", timestamp: string }

// DNS Server Detection - ✅ WORKING
GET /api/dns/current
Response: { servers: string[] }
// Example: { "servers": ["8.8.8.8"] }

// Start Benchmark - ✅ IMPLEMENTED
POST /api/benchmark/start
Body: {
  servers: string[],
  testType: 'quick' | 'full' | 'custom',
  domains?: string[],
  options?: BenchmarkOptions
}
Response: { testId: string, status: 'started' }

// Get Test Status - ✅ IMPLEMENTED
GET /api/benchmark/{testId}/status
Response: {
  status: 'running' | 'completed' | 'failed',
  progress: number,
  results?: BenchmarkResults
}

// Get Historical Results - ✅ IMPLEMENTED
GET /api/results?limit=10&offset=0
Response: { results: BenchmarkResult[], total: number }

// Export Results - ✅ IMPLEMENTED
GET /api/results/{testId}/export?format=csv|json
Response: CSV or JSON file download
```

### WebSocket Events

```typescript
// Client -> Server
socket.emit('start-benchmark', options)
socket.emit('cancel-benchmark', testId)

// Server -> Client
socket.on('benchmark-progress', { testId, progress, currentTest })
socket.on('benchmark-result', { testId, server, result })
socket.on('benchmark-complete', { testId, summary })
socket.on('benchmark-error', { testId, error })
```

## Database Schema

```sql
-- Test runs
CREATE TABLE test_runs (
  id UUID PRIMARY KEY,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  test_type VARCHAR(50),
  status VARCHAR(50),
  options JSON
);

-- Test results
CREATE TABLE test_results (
  id UUID PRIMARY KEY,
  test_run_id UUID REFERENCES test_runs(id),
  server_name VARCHAR(255),
  server_ip VARCHAR(45),
  avg_time FLOAT,
  min_time FLOAT,
  max_time FLOAT,
  median_time FLOAT,
  success_rate FLOAT,
  raw_data JSON
);

-- DNS servers
CREATE TABLE dns_servers (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  ip_address VARCHAR(45),
  type VARCHAR(50), -- 'public', 'custom', 'system'
  is_active BOOLEAN
);
```

## Development Phases

### Phase 1: Foundation (Week 1-2) - ✅ COMPLETED
- Set up React + TypeScript project with Vite
- Create Express.js backend with TypeScript
- Implement comprehensive DNS testing logic with system detection
- Design shadcn/ui component structure

### Phase 2: Core Features (Week 3-4) - ✅ COMPLETED
- DNS server detection (resolv.conf, systemd-resolve, NetworkManager)
- Full benchmarking functionality with concurrent testing
- Real-time WebSocket updates and progress monitoring
- Complete results display with statistics

### Phase 3: UI Polish (Week 5-6) - ✅ COMPLETED
- shadcn/ui design system integration
- Responsive design with Tailwind CSS
- Charts and visualizations (Recharts)
- Loading states and animations
- PostCSS configuration for Tailwind processing

### Phase 4: Advanced Features (Week 7-8) - ✅ COMPLETED
- Historical data storage with SQLite database
- Export functionality (CSV/JSON)
- Advanced test options (timeout, retries, concurrency)
- Comprehensive error handling and diagnostics

### Phase 5: Production Ready (Week 9-10) - ✅ COMPLETED
- Docker containerization with multi-stage builds
- Performance optimization and rate limiting
- Security hardening (helmet, CORS, input validation)
- Documentation and Playwright testing

## Security Considerations

1. **Input Validation**: Sanitize all DNS server inputs
2. **Rate Limiting**: Prevent abuse of benchmarking
3. **Authentication**: Optional user accounts for history
4. **CORS Configuration**: Proper origin restrictions
5. **DNS Query Limits**: Prevent amplification attacks
6. **Environment Variables**: Secure configuration management

## Performance Requirements

- **Concurrent Tests**: Support 10+ simultaneous benchmarks
- **Response Time**: < 100ms for UI interactions
- **WebSocket Latency**: < 50ms for real-time updates
- **Memory Usage**: < 256MB for typical operation
- **Database Queries**: < 10ms for result retrieval

## Deployment Options

### Local Development
```bash
npm run dev        # Frontend (Vite)
npm run server     # Backend (Express)
```

### Docker Deployment
```bash
docker-compose up -d
```

### Cloud Deployment
- **Frontend**: Vercel, Netlify, or CloudFlare Pages
- **Backend**: Railway, Render, or AWS ECS
- **Database**: Supabase, PlanetScale, or AWS RDS

## Success Metrics

1. **Page Load Time**: < 2 seconds
2. **Test Completion**: < 30 seconds for full benchmark
3. **User Engagement**: 80% complete initiated tests
4. **Error Rate**: < 1% failed tests due to app errors
5. **Mobile Usage**: 30% of users on mobile devices

## Future Enhancements

1. **Multi-region Testing**: Deploy test nodes globally
2. **AI Recommendations**: ML-based DNS optimization suggestions
3. **Team Features**: Share results across organizations
4. **API Access**: Public API for third-party integration
5. **Mobile Apps**: Native iOS/Android applications
6. **Browser Extension**: Quick DNS testing from browser