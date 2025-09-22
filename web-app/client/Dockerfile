# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for React frontend

ARG NODE_VERSION=20

# Development stage
FROM node:${NODE_VERSION}-alpine AS development

# Install necessary packages for development
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files for better layer caching
COPY client/package*.json ./
COPY shared/package*.json /shared/

# Install dependencies
RUN npm install

# Copy shared types
COPY shared /shared

# Copy source code
COPY client .

# Create non-root user for security
RUN addgroup -g 1001 -S reactjs && \
    adduser -S reactjs -u 1001

# Change ownership of app directory
RUN chown -R reactjs:reactjs /app /shared

USER reactjs

# Health check for development
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

# Copy package files
COPY client/package*.json ./
COPY shared/package*.json /shared/

# Install dependencies (production only)
RUN npm install --only=production

# Copy shared types
COPY shared /shared

# Copy source code
COPY client .

# Build the application
RUN npm run build

# Verify build output exists
RUN test -d /app/dist || (echo "Build failed: dist directory not found" && exit 1)

# Production stage
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

# Copy nginx configuration
COPY client/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Verify static files were copied
RUN test -f /usr/share/nginx/html/index.html || (echo "Frontend build files missing" && exit 1)

# Create nginx user if it doesn't exist and set permissions
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80 || exit 1

# Expose port
EXPOSE 80

# Use nginx user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]