#!/bin/bash

# DNS Bench Linux - Update Script
# Updates the installed DNS benchmark tool to the latest version

set -e

INSTALL_DIR="/usr/local/bin"
SCRIPT_NAME="dns-bench"
BACKUP_DIR="/tmp/dns-bench-backup"

echo "=== DNS Bench Linux Update Script ==="
echo

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
        echo "This script will update the system-wide installation. You may be prompted for your password."
    else
        echo "Error: This script needs to be run as root or with sudo privileges."
        exit 1
    fi
fi

# Check if dns-bench is currently installed
if [ -f "$INSTALL_DIR/$SCRIPT_NAME" ]; then
    echo "✓ Found existing installation at $INSTALL_DIR/$SCRIPT_NAME"

    # Create backup
    echo "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    $SUDO cp "$INSTALL_DIR/$SCRIPT_NAME" "$BACKUP_DIR/${SCRIPT_NAME}-$(date +%Y%m%d-%H%M%S)"
    echo "✓ Backup created in $BACKUP_DIR"
else
    echo "No existing installation found. This will perform a fresh installation."
fi

# Check if the latest version is available
if [ -f "./dns_bench_linux.py" ]; then
    echo "✓ Found latest version in current directory"
    LATEST_VERSION="./dns_bench_linux.py"
elif [ -f "/home/ansible/dns-bench/dns_bench_linux.py" ]; then
    echo "✓ Found latest version in project directory"
    LATEST_VERSION="/home/ansible/dns-bench/dns_bench_linux.py"
else
    echo "❌ Error: Latest version not found!"
    echo "Please ensure dns_bench_linux.py is in the current directory"
    exit 1
fi

# Install the updated version
echo "Installing updated version..."
$SUDO cp "$LATEST_VERSION" "$INSTALL_DIR/$SCRIPT_NAME"
$SUDO chmod +x "$INSTALL_DIR/$SCRIPT_NAME"

echo "✅ Update complete!"
echo

# Show version info
echo "=== New Features in This Version ==="
echo "• Fixed duplicate DNS server detection"
echo "• Added --top3 option for quick comparison"
echo "• Improved DNS server parsing and validation"
echo "• Better error handling and output formatting"
echo

echo "=== Updated Usage Examples ==="
echo "dns-bench --top3           # Quick test vs Cloudflare, Google, Quad9"
echo "dns-bench --current-only   # Test only your current DNS"
echo "dns-bench --verbose        # Show detailed results"
echo "dns-bench --help           # See all options"
echo

# Test the installation
echo "Testing installation..."
if "$INSTALL_DIR/$SCRIPT_NAME" --help >/dev/null 2>&1; then
    echo "✅ Installation test passed!"
    echo
    echo "🎯 Recommended: Try the new quick comparison:"
    echo "   dns-bench --top3"
else
    echo "❌ Installation test failed!"
    echo "Restoring backup..."
    if [ -f "$BACKUP_DIR"/${SCRIPT_NAME}-* ]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/${SCRIPT_NAME}-* | head -1)
        $SUDO cp "$LATEST_BACKUP" "$INSTALL_DIR/$SCRIPT_NAME"
        echo "Backup restored. Please check the installation manually."
    fi
    exit 1
fi
