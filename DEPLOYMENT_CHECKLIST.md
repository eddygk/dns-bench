# DNS Bench Production Deployment Checklist

## Pre-deployment Verification

### ✅ System Requirements
- [ ] Docker 20.10+ installed and running
- [ ] Docker Compose 2.0+ available
- [ ] Minimum 1GB RAM available
- [ ] Ports 80, 3001, 6379 available
- [ ] Network access for DNS testing (53/udp, 53/tcp)

### ✅ File Structure Verification
```bash
# Verify all required files exist
ls -la docker-compose.prod.yml deploy.sh .env.production redis.conf
ls -la web-app/client/Dockerfile web-app/server/Dockerfile
ls -la web-app/client/nginx.conf
```

## Deployment Process

### 1. Prerequisites Check
```bash
# Check Docker installation
docker --version
docker-compose --version

# Check available ports
netstat -tlnp | grep -E ':80|:3001|:6379'

# Verify script permissions
ls -la deploy.sh  # Should show -rwxr-xr-x
```

### 2. Environment Setup
```bash
# Copy environment template (if .env doesn't exist)
cp .env.production .env

# Edit configuration
nano .env  # Customize DOMAIN, CORS_ORIGIN, etc.
```

### 3. Production Deployment
```bash
# Run deployment script
./deploy.sh

# Expected output:
# - [INFO] Checking prerequisites...
# - [SUCCESS] All prerequisites met
# - [INFO] Setting up environment...
# - [INFO] Detecting host IP address...
# - [SUCCESS] Detected host IP: X.X.X.X
# - [INFO] Building and deploying services...
# - [SUCCESS] DNS Bench deployed successfully!
```

### 4. Post-deployment Verification

#### Service Health Checks
```bash
# Check service status
./deploy.sh status

# Expected: All services should show "Up" status

# Check individual health
docker inspect dns-bench-frontend --format='{{.State.Health.Status}}'
docker inspect dns-bench-backend --format='{{.State.Health.Status}}'
docker inspect dns-bench-redis --format='{{.State.Health.Status}}'

# Expected: All should return "healthy"
```

#### Application Access
```bash
# Test frontend access
curl -I http://localhost:80/
# Expected: HTTP/200 OK

# Test backend health
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}

# Test Redis
docker exec dns-bench-redis redis-cli ping
# Expected: PONG
```

#### Functional Testing
- [ ] Navigate to frontend URL in browser
- [ ] Verify DNS configuration page loads
- [ ] Run a quick benchmark test
- [ ] Check real-time updates work
- [ ] Verify results display correctly
- [ ] Test settings page functionality

## Production Management

### Monitoring Commands
```bash
# View real-time logs
./deploy.sh logs

# Check resource usage
docker stats

# Monitor disk usage
df -h ./data ./config
```

### Maintenance Commands
```bash
# Update deployment
git pull
./deploy.sh update

# Restart services
./deploy.sh restart

# Stop services
./deploy.sh stop

# Complete cleanup (destructive)
./deploy.sh cleanup
```

## Development vs Production Configuration

### ⚠️ Critical Rate Limiting Differences

**Development Environment:**
- Rate limit: **1000 requests per 15 minutes**
- Allows for React hot reloading, debugging, multiple page visits
- Configured via `NODE_ENV=development`

**Production Environment:**
- Rate limit: **100 requests per 15 minutes**
- Appropriate for real users and security
- Automatically applied when `NODE_ENV=production`

**Key Files:**
```javascript
// /web-app/server/src/index.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: 'Too many requests from this IP, please try again later.'
})
```

### 🔧 Deployment Environment Variables

**Critical:** Ensure `NODE_ENV` is properly set during deployment:

```bash
# Development (Docker)
NODE_ENV=development  # High rate limits for testing

# Production (Docker)
NODE_ENV=production   # Strict rate limits for security
```

**Verification:**
```bash
# Check current environment
docker exec dns-bench-backend sh -c 'echo $NODE_ENV'

# Should return "production" in production deployments
```

## Troubleshooting

### Common Issues and Solutions

**Build failures:**
```bash
# Clear Docker cache and rebuild
docker system prune -f
./deploy.sh cleanup
./deploy.sh
```

**Health check failures:**
```bash
# Check service logs
./deploy.sh logs

# Check individual service
docker logs dns-bench-backend
docker logs dns-bench-frontend
docker logs dns-bench-redis
```

**Port conflicts:**
```bash
# Check what's using the ports
lsof -i :80 -i :3001 -i :6379

# Stop conflicting services
sudo systemctl stop nginx  # If nginx is running on port 80
```

**Permission issues:**
```bash
# Fix data directory permissions
sudo chown -R $USER:$USER ./data ./config

# Fix script permissions
chmod +x deploy.sh
```

**Rate limiting errors (HTTP 429):**
```bash
# Symptom: "Too many requests from this IP" or "Failed to fetch history"
# Root cause: Multiple API calls from React development patterns

# Check current environment
docker exec dns-bench-backend sh -c 'echo $NODE_ENV'

# If production but in development, update environment:
docker-compose down
# Edit docker-compose.yml to set NODE_ENV=development
docker-compose up -d

# Or wait for rate limit reset (15 minutes)

# Long-term fix: Ensure proper environment configuration
```

**React development issues (duplicate API calls):**
```bash
# Symptom: Multiple "Fetching from API..." console messages
# Root cause: React StrictMode double-rendering or hot reload

# This is normal in development and handled by:
# 1. useRef guards preventing duplicate requests
# 2. Higher development rate limits (1000 vs 100)
# 3. Proper component lifecycle management
```

### Performance Verification

**Expected Performance:**
- Frontend loads in < 2 seconds
- Backend API responds in < 200ms
- DNS benchmarks complete in 10-30 seconds
- Memory usage < 1GB total
- Health checks pass consistently

**Load Testing:**
```bash
# Test concurrent connections
for i in {1..10}; do curl -s http://localhost:80/ >/dev/null & done
wait

# Monitor during load
docker stats --no-stream
```

## Security Checklist

### Container Security
- [ ] All containers run as non-root users
- [ ] Health checks are configured and passing
- [ ] Logs are properly rotated
- [ ] No sensitive data in environment variables
- [ ] Network isolation is properly configured

### Application Security
- [ ] CORS is properly configured for your domain
- [ ] Rate limiting is active and environment-appropriate:
  - [ ] **Production**: 100 requests/15min (`NODE_ENV=production`)
  - [ ] **Development**: 1000 requests/15min (`NODE_ENV=development`)
- [ ] Input validation is working
- [ ] No debug information exposed in production
- [ ] SSL/TLS configured (if using reverse proxy)

## Backup and Recovery

### Data Backup
```bash
# Backup configuration and data
tar -czf dns-bench-backup-$(date +%Y%m%d).tar.gz \
    ./data ./config .env

# Backup database separately
cp ./data/dns-bench.db ./data/dns-bench-backup-$(date +%Y%m%d).db
```

### Disaster Recovery
```bash
# Stop services
./deploy.sh stop

# Restore data
tar -xzf dns-bench-backup-YYYYMMDD.tar.gz

# Restart services
./deploy.sh
```

## Final Verification

**✅ Deployment Successful Indicators:**
- [ ] All containers are "healthy" status
- [ ] Frontend accessible at http://YOUR_IP:80
- [ ] Backend API responds at http://YOUR_IP:3001/api/health
- [ ] DNS benchmarks complete successfully
- [ ] Real-time updates work correctly
- [ ] Data persists between restarts
- [ ] Logs are being generated properly

**🎯 Ready for Production:**
- [ ] Performance meets requirements
- [ ] Security checklist completed
- [ ] Backup strategy implemented
- [ ] Monitoring setup (optional)
- [ ] Documentation updated
- [ ] Team trained on management commands

---

**Deployment completed successfully! 🚀**

For ongoing support:
- Use `./deploy.sh help` for command reference
- Check logs with `./deploy.sh logs`
- Monitor health with `./deploy.sh status`
- Update with `./deploy.sh update`