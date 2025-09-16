# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context7 Integration
When working on this project, use context7 for fetching up-to-date documentation and code examples. Add "use context7" to prompts when you need current information about:
- React 18+ patterns and hooks
- Node.js/Express API development
- DNS protocols and libraries
- Chart.js or D3.js for data visualization
- GitHub Primer/spec-kit design patterns
- WebSocket implementations for real-time updates

## Project Overview

DNS Bench Linux is a comprehensive DNS benchmarking tool that automatically detects and tests DNS server performance. The tool is distributed as a shell installer script that embeds a Python script for the actual benchmarking functionality.

## Architecture

The project consists of:
- **install_dns_bench.sh**: Installation script that embeds the full Python DNS benchmarking tool within itself (lines 46-385) and installs it to `/usr/local/bin/dns-bench`
- **update_dns_bench.sh**: Update script for upgrading existing installations
- The actual DNS benchmarking tool is a Python script embedded within the installer, not stored as a separate file in the repository

## Key Implementation Details

### DNS Server Detection Methods
The tool uses multiple methods to detect current DNS servers (implemented in `get_current_dns_servers()`):
1. Parsing `/etc/resolv.conf`
2. Querying systemd-resolved via `systemd-resolve --status` or `resolvectl status`
3. NetworkManager via `nmcli dev show`

### Benchmarking Approach
- Tests 20 diverse domains including international sites
- Uses ThreadPoolExecutor with max_workers=3 for concurrent DNS queries
- Supports both `dig` and `nslookup` commands with automatic fallback
- Calculates statistics: average, min, max, median response times, and success rates

### Public DNS Servers Tested
The tool benchmarks against 10 public DNS servers (5 providers with primary/secondary):
- Cloudflare (1.1.1.1, 1.0.0.1)
- Google (8.8.8.8, 8.8.4.4)
- Quad9 (9.9.9.9, 149.112.112.112)
- OpenDNS (208.67.222.222, 208.67.220.220)
- Level3 (4.2.2.1, 4.2.2.2)

## Development Commands

### Testing the Tool
Since the Python script is embedded in the installer, to test changes:

```bash
# Extract and run the embedded Python script from installer
sed -n '46,385p' install_dns_bench.sh > /tmp/test_dns_bench.py
python3 /tmp/test_dns_bench.py --help
python3 /tmp/test_dns_bench.py --verbose
```

### Installing/Updating
```bash
# Install
sudo ./install_dns_bench.sh

# Update (expects dns_bench_linux.py in /tmp/ or current directory)
sudo ./update_dns_bench.sh
```

### Running Tests
```bash
# Quick test against top 3 providers
dns-bench --top3

# Full benchmark
dns-bench

# Test current DNS only
dns-bench --current-only

# Verbose output with per-domain timing
dns-bench --verbose
```

## Important Notes

- The actual Python benchmarking code is embedded within install_dns_bench.sh (lines 46-385), not stored as a separate .py file
- The tool filters out localhost DNS servers (127.x.x.x addresses)
- Uses a 2-second timeout for DNS queries with 1 retry attempt
- Requires either `dig` (preferred) or `nslookup` command to be available
- Installation requires root/sudo privileges as it installs to `/usr/local/bin`