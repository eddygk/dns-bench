#!/bin/bash

# Docker Cleanup Script for Development Environment
# Safely removes unused Docker resources to recover disk space
# Version: 1.0
# Author: Lead Engineer

set -euo pipefail  # Exit on any error, undefined variable, or pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running or not accessible. Please start Docker and try again."
        exit 1
    fi
    log_info "Docker is running and accessible"
}

# Function to show disk space before cleanup
show_initial_space() {
    log_info "Current disk usage:"
    df -h / | tail -1
    echo
    log_info "Docker system usage before cleanup:"
    docker system df
    echo
}

# Function to show what will be cleaned
show_cleanup_preview() {
    log_info "=== CLEANUP PREVIEW ==="

    # Count stopped containers
    STOPPED_CONTAINERS=$(docker ps -a -f status=exited -q | wc -l)
    log_info "Stopped containers to remove: $STOPPED_CONTAINERS"

    # Count dangling images
    DANGLING_IMAGES=$(docker images -f dangling=true -q | wc -l)
    log_info "Dangling images to remove: $DANGLING_IMAGES"

    # Count unused networks (excluding default networks)
    UNUSED_NETWORKS=$(docker network ls -f dangling=true -q | wc -l)
    log_info "Unused networks to remove: $UNUSED_NETWORKS"

    # Count unused volumes
    UNUSED_VOLUMES=$(docker volume ls -f dangling=true -q | wc -l)
    log_info "Unused volumes to remove: $UNUSED_VOLUMES"

    log_info "Build cache will be completely cleared"

    # Show additional cleanup items
    NPM_CACHE_SIZE=$(du -sh ~/.npm 2>/dev/null | cut -f1 || echo "0")
    log_info "npm cache size: $NPM_CACHE_SIZE (will be cleared)"

    APT_CACHE_SIZE=$(sudo du -sh /var/cache/apt 2>/dev/null | cut -f1 || echo "0")
    log_info "apt cache size: $APT_CACHE_SIZE (will be cleared if sudo available)"

    VSCODE_CACHE_SIZE=$(du -sh ~/.vscode-server/data/CachedExtensionVSIXs 2>/dev/null | cut -f1 || echo "0")
    log_info "VS Code extension cache: $VSCODE_CACHE_SIZE (will be cleared)"

    # Show optional development tools that could be cleaned
    GO_SIZE=$(du -sh /usr/lib/go-1.18 2>/dev/null | cut -f1 || echo "0")
    if [ "$GO_SIZE" != "0" ]; then
        log_info "Go runtime: $GO_SIZE (can be removed if not needed)"
    fi

    DEV_CACHE_SIZE=$(du -sh ~/.cache 2>/dev/null | cut -f1 || echo "0")
    log_info "Development cache: $DEV_CACHE_SIZE (will be cleared)"

    echo
}

# Function to confirm cleanup action
confirm_cleanup() {
    log_warning "This will permanently delete unused Docker resources."
    log_warning "Running containers and their images will NOT be affected."
    echo
    read -p "Do you want to proceed? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled by user."
        exit 0
    fi
    echo
}

# Function to clean stopped containers
clean_stopped_containers() {
    log_info "Step 1/5: Removing stopped containers..."

    STOPPED_CONTAINERS=$(docker ps -a -f status=exited -q)
    if [ -n "$STOPPED_CONTAINERS" ]; then
        docker rm $STOPPED_CONTAINERS
        REMOVED_COUNT=$(echo "$STOPPED_CONTAINERS" | wc -l)
        log_success "Removed $REMOVED_COUNT stopped container(s)"
    else
        log_info "No stopped containers to remove"
    fi
    echo
}

# Function to clean dangling images (with dependency handling)
clean_dangling_images() {
    log_info "Step 2/5: Removing dangling images..."

    DANGLING_IMAGES=$(docker images -f dangling=true -q)
    if [ -n "$DANGLING_IMAGES" ]; then
        # First, try to remove images normally
        docker rmi $DANGLING_IMAGES 2>/dev/null || {
            log_warning "Some dangling images have dependency conflicts. Attempting safe cleanup..."

            # Remove any remaining exited containers that might block image removal
            EXITED_CONTAINERS=$(docker ps -a -f status=exited -q)
            if [ -n "$EXITED_CONTAINERS" ]; then
                log_info "Removing exited containers that block image cleanup..."
                docker rm $EXITED_CONTAINERS 2>/dev/null || true
            fi

            # Remove any containers in 'created' status (failed builds)
            CREATED_CONTAINERS=$(docker ps -a -f status=created -q)
            if [ -n "$CREATED_CONTAINERS" ]; then
                log_info "Removing containers in created status..."
                docker rm $CREATED_CONTAINERS 2>/dev/null || true
            fi

            # Now try removing dangling images again
            REMAINING_DANGLING=$(docker images -f dangling=true -q)
            if [ -n "$REMAINING_DANGLING" ]; then
                docker rmi $REMAINING_DANGLING 2>/dev/null || {
                    log_warning "Some dangling images still have dependencies - this is safe to ignore"
                }
            fi
        }

        # Count how many were actually removed
        FINAL_DANGLING=$(docker images -f dangling=true -q | wc -l)
        REMOVED_COUNT=$(($(echo "$DANGLING_IMAGES" | wc -l) - FINAL_DANGLING))

        if [ $REMOVED_COUNT -gt 0 ]; then
            log_success "Removed $REMOVED_COUNT dangling image(s)"
        else
            log_info "No dangling images could be safely removed"
        fi
    else
        log_info "No dangling images to remove"
    fi
    echo
}

# Function to clean unused networks
clean_unused_networks() {
    log_info "Step 3/6: Removing unused networks..."

    # Use docker network prune to safely remove unused networks
    # This command excludes default networks (bridge, host, none)
    NETWORK_OUTPUT=$(docker network prune -f 2>&1)
    if echo "$NETWORK_OUTPUT" | grep -q "Total reclaimed space"; then
        log_success "Unused networks cleaned up"
        echo "$NETWORK_OUTPUT" | grep "Total reclaimed space"
    else
        log_info "No unused networks to remove"
    fi
    echo
}

# Function to clean unused volumes
clean_unused_volumes() {
    log_info "Step 4/6: Removing unused volumes..."

    UNUSED_VOLUMES=$(docker volume ls -f dangling=true -q)
    if [ -n "$UNUSED_VOLUMES" ]; then
        docker volume rm $UNUSED_VOLUMES
        REMOVED_COUNT=$(echo "$UNUSED_VOLUMES" | wc -l)
        log_success "Removed $REMOVED_COUNT unused volume(s)"
    else
        log_info "No unused volumes to remove"
    fi
    echo
}

# Function to clear build cache
clear_build_cache() {
    log_info "Step 5/6: Clearing Docker build cache..."

    BUILD_CACHE_OUTPUT=$(docker builder prune -af 2>&1)
    if echo "$BUILD_CACHE_OUTPUT" | grep -q "Total reclaimed space"; then
        log_success "Build cache cleared"
        echo "$BUILD_CACHE_OUTPUT" | grep "Total reclaimed space"
    else
        log_info "No build cache to clear"
    fi
    echo
}

# Function to clean system caches
clean_system_caches() {
    log_info "Step 6/6: Cleaning system caches..."

    # Clean npm cache
    if command -v npm >/dev/null 2>&1; then
        NPM_CACHE_BEFORE=$(du -sb ~/.npm 2>/dev/null | cut -f1 || echo "0")
        npm cache clean --force >/dev/null 2>&1 || true
        NPM_CACHE_AFTER=$(du -sb ~/.npm 2>/dev/null | cut -f1 || echo "0")
        NPM_SAVED=$((NPM_CACHE_BEFORE - NPM_CACHE_AFTER))
        if [ $NPM_SAVED -gt 0 ]; then
            NPM_SAVED_MB=$((NPM_SAVED / 1024 / 1024))
            log_success "Cleared npm cache (saved ${NPM_SAVED_MB}MB)"
        fi
    fi

    # Clean apt cache (if we have sudo access)
    if command -v apt-get >/dev/null 2>&1; then
        APT_CACHE_BEFORE=$(sudo du -sb /var/cache/apt 2>/dev/null | cut -f1 || echo "0")
        if sudo apt-get clean >/dev/null 2>&1; then
            APT_CACHE_AFTER=$(sudo du -sb /var/cache/apt 2>/dev/null | cut -f1 || echo "0")
            APT_SAVED=$((APT_CACHE_BEFORE - APT_CACHE_AFTER))
            if [ "$APT_SAVED" -gt 0 ] 2>/dev/null; then
                APT_SAVED_MB=$((APT_SAVED / 1024 / 1024))
                log_success "Cleared apt cache (saved ${APT_SAVED_MB}MB)"
            fi
        else
            log_warning "Could not clean apt cache (no sudo access)"
        fi
    fi

    # Clean VS Code extension cache
    if [ -d ~/.vscode-server/data/CachedExtensionVSIXs ]; then
        VSCODE_CACHE_BEFORE=$(du -sb ~/.vscode-server/data/CachedExtensionVSIXs 2>/dev/null | cut -f1 || echo "0")
        rm -rf ~/.vscode-server/data/CachedExtensionVSIXs/* 2>/dev/null || true
        VSCODE_CACHE_AFTER=$(du -sb ~/.vscode-server/data/CachedExtensionVSIXs 2>/dev/null | cut -f1 || echo "0")
        VSCODE_SAVED=$((VSCODE_CACHE_BEFORE - VSCODE_CACHE_AFTER))
        if [ $VSCODE_SAVED -gt 0 ]; then
            VSCODE_SAVED_MB=$((VSCODE_SAVED / 1024 / 1024))
            log_success "Cleared VS Code extension cache (saved ${VSCODE_SAVED_MB}MB)"
        fi
    fi

    # Clean development cache directories
    if [ -d ~/.cache ]; then
        CACHE_BEFORE=$(du -sb ~/.cache 2>/dev/null | cut -f1 || echo "0")
        # Clean pip cache, pytest cache, etc.
        rm -rf ~/.cache/pip* ~/.cache/pytest* ~/.cache/yarn* ~/.cache/node* 2>/dev/null || true
        CACHE_AFTER=$(du -sb ~/.cache 2>/dev/null | cut -f1 || echo "0")
        CACHE_SAVED=$((CACHE_BEFORE - CACHE_AFTER))
        if [ $CACHE_SAVED -gt 0 ]; then
            CACHE_SAVED_MB=$((CACHE_SAVED / 1024 / 1024))
            log_success "Cleaned development cache (saved ${CACHE_SAVED_MB}MB)"
        fi
    fi

    # Clean temporary files
    if [ -d /tmp ]; then
        TEMP_BEFORE=$(du -sb /tmp 2>/dev/null | cut -f1 || echo "0")
        find /tmp -type f -atime +7 -user "$(whoami)" -delete 2>/dev/null || true
        TEMP_AFTER=$(du -sb /tmp 2>/dev/null | cut -f1 || echo "0")
        TEMP_SAVED=$((TEMP_BEFORE - TEMP_AFTER))
        if [ $TEMP_SAVED -gt 0 ]; then
            TEMP_SAVED_MB=$((TEMP_SAVED / 1024 / 1024))
            log_success "Cleaned temporary files (saved ${TEMP_SAVED_MB}MB)"
        fi
    fi

    echo
}

# Function to show final results
show_final_results() {
    log_info "=== CLEANUP COMPLETE ==="

    log_info "Current disk usage after cleanup:"
    df -h / | tail -1
    echo

    log_info "Docker system usage after cleanup:"
    docker system df
    echo

    log_success "Docker cleanup completed successfully!"
    log_info "Your development environment should now have more available disk space."
}

# Function to handle script interruption
cleanup_on_exit() {
    log_warning "Script interrupted. Partial cleanup may have occurred."
    exit 1
}

# Set trap for clean exit on interruption
trap cleanup_on_exit INT TERM

# Main execution flow
main() {
    echo "=================================================="
    echo "    Docker Development Environment Cleanup"
    echo "=================================================="
    echo

    # Pre-cleanup checks and information
    check_docker
    show_initial_space
    show_cleanup_preview
    confirm_cleanup

    # Execute cleanup steps
    log_info "Starting Docker cleanup process..."
    echo

    clean_stopped_containers
    clean_dangling_images
    clean_unused_networks
    clean_unused_volumes
    clear_build_cache
    clean_system_caches

    # Show results
    show_final_results
}

# Run main function
main "$@"