# Docker Build Issues - Engineering Task Brief

**Priority**: High
**Type**: Infrastructure/DevOps
**Estimated Effort**: 2-4 hours
**Last Updated**: 2025-09-23

## Executive Summary

The DNS Bench application currently has a **non-standard Docker development setup** that requires manual intervention to function properly. While hot reloading works, the build process is unreliable and not suitable for distribution or onboarding new developers.

## Current State

### ✅ What Works
- Hot reloading development environment via `docker-compose -f docker-compose.dev.yml up`
- Frontend (React + Vite) on http://localhost:3000
- Backend (Express + tsx) on http://localhost:3001
- Auto-restart policies configured (`restart: unless-stopped`)
- Real-time code changes with bind mounts

### ❌ What's Broken
- **Standard Docker build process fails**
- **Dependencies missing after container builds**
- **Manual intervention required for basic functionality**
- **Not reproducible for new developers**

## Root Issues Identified

### 1. Dockerfile Build Hangs (Critical)

**Files Affected:**
- `web-app/client/Dockerfile`
- `web-app/server/Dockerfile`

**Symptom:** Build process hangs indefinitely on step:
```dockerfile
RUN chown -R nodejs:nodejs /app && \
    chown -R nodejs:nodejs /shared
```

**Root Cause:** Docker layer performance issue when changing ownership of large `node_modules` directories (400+ packages, ~500MB). The `chown` operation on thousands of small files causes Docker to hang or timeout.

**Current Workaround:** Created "optimized" Dockerfiles that create user first, then install dependencies as that user. This avoids the problematic `chown` step but doesn't address the underlying issue.

### 2. Incomplete Dependency Installation

**Files Affected:**
- `web-app/client/package.json` (has all deps listed)
- Container runtime environment

**Symptom:** Radix UI packages listed in package.json are not available in running containers:
```
Failed to resolve import "@radix-ui/react-checkbox"
Failed to resolve import "@radix-ui/react-toggle-group"
Failed to resolve import "@radix-ui/react-slider"
```

**Root Cause:** The npm install during Docker build is not completing successfully or the installed packages are being overridden by bind mounts.

**Current Workaround:** Manual `docker exec dns-bench_client_1 npm install` after containers start.

### 3. Non-Standard Docker Patterns

**Issue:** Current solution deviates from Docker best practices:
- Runtime dependency installation instead of build-time
- Dependency on manual intervention
- State that doesn't persist across rebuilds

## Technical Analysis

### Package Manifest Verification
```bash
# All required packages ARE in package.json:
- "@radix-ui/react-checkbox": "^1.3.3"
- "@radix-ui/react-toggle-group": "^1.1.11"
- "@radix-ui/react-slider": "^1.3.6"
# + 20+ other Radix UI packages
```

### Bind Mount Configuration
```yaml
# docker-compose.dev.yml - Current bind mounts:
volumes:
  - ./web-app/client/src:/app/src
  - ./web-app/client/public:/app/public
  - /app/node_modules  # Anonymous volume to preserve container's node_modules
```

**Analysis:** The anonymous volume `/app/node_modules` should preserve the container's installed packages, but this isn't working as expected.

### Build Context Analysis
```bash
# Build context size: 19.69MB
# Contains: Source code, package files, shared types
# Issue: Large context may contribute to build performance problems
```

## Required Fixes

### Primary Objectives
1. **Eliminate manual dependency installation**
2. **Fix Dockerfile build hanging**
3. **Ensure `docker-compose up` works without intervention**
4. **Maintain hot reloading functionality**

### Success Criteria
```bash
# This should work for any developer:
git clone <repo>
cd dns-bench
docker-compose -f docker-compose.dev.yml up
# Application loads without errors at localhost:3000
# Hot reloading works for both frontend and backend
# No manual steps required
```

## Investigation Areas

### 1. Dockerfile Optimization
**File:** `web-app/client/Dockerfile`

**Current Problematic Pattern:**
```dockerfile
# Install deps as root
RUN npm install
# Create user
RUN addgroup -g 1001 -S reactjs && adduser -S reactjs -u 1001
# Problematic: chown large node_modules
RUN chown -R reactjs:reactjs /app  # <-- HANGS HERE
```

**Alternative Patterns to Test:**
```dockerfile
# Pattern A: Install as target user from start
RUN addgroup -g 1001 -S reactjs && adduser -S reactjs -u 1001
USER reactjs
RUN npm install

# Pattern B: Multi-stage with selective copying
FROM node:20-alpine AS deps
COPY package*.json ./
RUN npm install
FROM node:20-alpine AS runtime
COPY --from=deps /app/node_modules ./node_modules

# Pattern C: Use npm cache mount (buildkit)
RUN --mount=type=cache,target=/root/.npm npm install
```

### 2. Build Context Optimization
**Investigate:**
- `.dockerignore` effectiveness (currently reduces context from 19.4MB)
- Whether large shared types are causing issues
- Build cache utilization

### 3. Dependency Resolution
**Debug Commands:**
```bash
# Verify what's actually installed during build
docker run --rm -it dns-bench_client sh -c "ls -la node_modules/@radix-ui/"
docker run --rm -it dns-bench_client sh -c "npm list @radix-ui/react-checkbox"

# Check if bind mounts are overriding
docker exec dns-bench_client_1 mount | grep node_modules
```

## Files Requiring Attention

### Primary Files
- `web-app/client/Dockerfile` - Fix build hang and dependency installation
- `web-app/server/Dockerfile` - Apply same fixes
- `docker-compose.dev.yml` - Verify volume configurations
- `web-app/client/.dockerignore` - Optimize build context

### Backup Files (Current Workarounds)
- `web-app/server/Dockerfile.backup` - Original problematic version
- `web-app/server/Dockerfile.optimized` - Current workaround version

### Package Files
- `web-app/client/package.json` - Verify all deps are correct versions
- `web-app/client/package-lock.json` - May need regeneration

## Risk Assessment

### Low Risk Changes
- Dockerfile optimization patterns
- Build context improvements
- `.dockerignore` updates

### Medium Risk Changes
- Volume mount restructuring
- Package.json modifications
- Build cache strategies

### High Risk Changes
- Major Docker architecture changes
- Bind mount strategy overhaul

## Implementation Strategy

### Phase 1: Diagnosis (30 mins)
1. Reproduce build hang with timing measurements
2. Verify exact point of failure in Dockerfile
3. Test dependency installation in isolation

### Phase 2: Dockerfile Fix (1-2 hours)
1. Implement user-first installation pattern
2. Test multi-stage build approach
3. Optimize build context and caching

### Phase 3: Integration Testing (30-60 mins)
1. Clean rebuild from scratch
2. Verify hot reloading still works
3. Test dependency persistence across rebuilds

### Phase 4: Documentation (30 mins)
1. Update setup instructions
2. Document new build process
3. Add troubleshooting guide

## Expected Blockers

1. **Build performance**: Large node_modules may still cause slowness
2. **Volume conflicts**: Bind mounts vs container volumes
3. **Cache invalidation**: Build cache may need clearing
4. **Platform differences**: Alpine vs Ubuntu base image considerations

## Testing Commands

```bash
# Clean rebuild test
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
docker-compose -f docker-compose.dev.yml up --build

# Dependency verification
docker exec dns-bench_client_1 npm list @radix-ui/react-checkbox
curl http://localhost:3000 # Should load without errors

# Hot reload test
echo "// test change" >> web-app/client/src/App.tsx
# Should see instant updates in browser
```

## Success Metrics

- [ ] `docker-compose up` completes without hanging
- [ ] All dependencies available without manual installation
- [ ] Application loads at localhost:3000 without errors
- [ ] Hot reloading works for frontend and backend
- [ ] Rebuild from scratch works consistently
- [ ] Setup time < 5 minutes for new developers

---

**Next Engineer Notes:**
- The current environment IS working with workarounds
- Don't break hot reloading - it's correctly implemented
- Focus on build-time dependency installation
- The optimized Dockerfiles can be reference but shouldn't be the final solution
- All required packages are in package.json - it's a build process issue, not a missing dependency issue