# syntax=docker/dockerfile:1
# Optimized Dockerfile for Node.js backend - avoids chown issues

ARG NODE_VERSION=20

# Development stage - optimized for fast iteration
FROM node:${NODE_VERSION}-alpine AS development

# Install system dependencies for DNS tools and native modules
RUN apk add --no-cache \
    bind-tools \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user early
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create directories with correct ownership from the start
RUN mkdir -p /app /shared /app/data && \
    chown -R nodejs:nodejs /app /shared

USER nodejs
WORKDIR /app

# Copy package files with correct ownership
COPY --chown=nodejs:nodejs server/package*.json ./
COPY --chown=nodejs:nodejs shared/package*.json /shared/

# Install dependencies (this layer caches well)
RUN npm install

# Copy shared types only (minimal, rarely changes)
COPY --chown=nodejs:nodejs shared /shared

# Copy source code
COPY --chown=nodejs:nodejs server ./

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Expose port
EXPOSE 3001

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM node:${NODE_VERSION}-alpine AS build

# Install system dependencies
RUN apk add --no-cache \
    bind-tools \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY server/package*.json ./
COPY shared/package*.json /shared/

# Install dependencies (include dev dependencies for build)
RUN npm install

# Copy shared types
COPY shared /shared

# Copy source code
COPY server .

# Build the application
RUN npm run build

# Verify build output exists
RUN test -d /app/dist || (echo "Build failed: dist directory not found" && exit 1)
RUN test -f /app/dist/index.js || (echo "Build failed: main entry point not found" && exit 1)

# Production stage
FROM node:${NODE_VERSION}-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    bind-tools \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install production dependencies only
COPY server/package*.json ./
RUN npm install --only=production && \
    npm cache clean --force

# Copy built application with proper ownership
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /shared /shared

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# Create directory for configuration files
RUN mkdir -p /app/config && chown -R nodejs:nodejs /app/config

# Switch to non-root user
USER nodejs

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]