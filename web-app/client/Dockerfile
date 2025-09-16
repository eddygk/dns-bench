# Multi-stage Dockerfile for React frontend

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies
COPY client/package*.json ./
RUN npm install

# Copy shared types
COPY shared /shared

# Copy source code
COPY client .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY client/package*.json ./
COPY shared/package.json /shared/package.json

# Install dependencies
RUN npm install

# Copy shared types
COPY shared /shared

# Copy source code
COPY client .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY client/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]