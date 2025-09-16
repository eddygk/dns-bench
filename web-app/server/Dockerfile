# Multi-stage Dockerfile for Node.js backend

# Development stage
FROM node:20-alpine AS development

# Install system dependencies for DNS tools and native modules
RUN apk add --no-cache \
    bind-tools \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY server/package*.json ./
RUN npm install

# Copy shared types
COPY shared /shared

# Copy source code
COPY server .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM node:20-alpine AS build

# Install system dependencies
RUN apk add --no-cache \
    bind-tools \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY server/package*.json ./
COPY shared/package.json /shared/package.json

# Install dependencies
RUN npm install

# Copy shared types
COPY shared /shared

# Copy source code
COPY server .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    bind-tools \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install production dependencies
COPY server/package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /shared /shared

# Create data directory
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]