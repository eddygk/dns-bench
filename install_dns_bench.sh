#!/bin/bash

# DNS Bench Linux - Installation Script
# Installs a DNS benchmarking tool similar to Steve Gibson's DNS Bench

set -e

INSTALL_DIR="/usr/local/bin"
SCRIPT_NAME="dns-bench"

echo "=== DNS Bench Linux Installation ==="
echo

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
        echo "This script will install system-wide. You may be prompted for your password."
    else
        echo "Error: This script needs to be run as root or with sudo privileges."
        exit 1
    fi
fi

echo "Installing dependencies..."

# Install required packages
if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update
    $SUDO apt-get install -y python3 python3-pip dnsutils
elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y python3 python3-pip bind-utils
elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y python3 python3-pip bind-utils
elif command -v pacman >/dev/null 2>&1; then
    $SUDO pacman -S --noconfirm python python-pip bind-tools
else
    echo "Warning: Could not detect package manager. Please install python3 and dig manually."
fi

# Create the DNS benchmark script
echo "Creating DNS benchmark script..."

cat > /tmp/dns_bench_final.py << 'EOF'
#!/usr/bin/env python3
"""
DNS Benchmark Tool for Linux
Similar to Steve Gibson's DNS Bench - automatically detects current DNS servers
and benchmarks them against popular public DNS servers.
"""

import subprocess
import time
import statistics
import sys
import argparse
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple

class DNSBenchmark:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.test_domains = [
            'google.com', 'facebook.com', 'youtube.com', 'amazon.com',
            'wikipedia.org', 'twitter.com', 'instagram.com', 'linkedin.com',
            'github.com', 'stackoverflow.com', 'reddit.com', 'netflix.com',
            'apple.com', 'microsoft.com', 'cloudflare.com', 'baidu.com',
            'yahoo.com', 'ebay.com', 'cnn.com', 'bbc.com'
        ]
        
        self.public_dns_servers = {
            'Cloudflare': '1.1.1.1',
            'Cloudflare-2': '1.0.0.1', 
            'Google': '8.8.8.8',
            'Google-2': '8.8.4.4',
            'Quad9': '9.9.9.9',
            'Quad9-2': '149.112.112.112',
            'OpenDNS': '208.67.222.222',
            'OpenDNS-2': '208.67.220.220',
            'Level3': '4.2.2.1',
            'Level3-2': '4.2.2.2'
        }

    def get_current_dns_servers(self) -> List[str]:
        """Get current DNS servers from system configuration"""
        dns_servers = []
        
        # Method 1: /etc/resolv.conf
        try:
            with open('/etc/resolv.conf', 'r') as f:
                for line in f:
                    if line.strip().startswith('nameserver'):
                        server = line.strip().split()[1]
                        if not server.startswith('127.') and server not in dns_servers:
                            dns_servers.append(server)
        except Exception:
            pass
        
        # Method 2: systemd-resolve/resolvectl
        for cmd in ['systemd-resolve --status', 'resolvectl status']:
            try:
                result = subprocess.run(cmd.split(), capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if 'DNS Servers:' in line:
                            server = line.split(':')[1].strip()
                            if server and not server.startswith('127.') and server not in dns_servers:
                                dns_servers.append(server)
            except Exception:
                continue
        
        # Method 3: nmcli
        try:
            result = subprocess.run(['nmcli', 'dev', 'show'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'IP4.DNS' in line:
                        server = line.split(':')[1].strip()
                        if server and not server.startswith('127.') and server not in dns_servers:
                            dns_servers.append(server)
        except Exception:
            pass
        
        return dns_servers

    def query_dns(self, domain: str, dns_server: str) -> Tuple[bool, float]:
        """Query DNS server and return success status and response time"""
        try:
            start_time = time.time()
            
            # Use dig if available, otherwise fallback to nslookup
            if self.dig_available:
                result = subprocess.run([
                    'dig', '+short', '+time=2', '+tries=1', f'@{dns_server}', domain
                ], capture_output=True, text=True, timeout=3)
            else:
                result = subprocess.run([
                    'nslookup', domain, dns_server
                ], capture_output=True, text=True, timeout=3)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            if result.returncode == 0:
                if self.dig_available:
                    success = bool(result.stdout.strip())
                else:
                    success = 'NXDOMAIN' not in result.stdout and result.stdout.strip()
                return success, response_time if success else float('inf')
            
            return False, float('inf')
            
        except Exception as e:
            if self.verbose:
                print(f"Error querying {domain} on {dns_server}: {e}")
            return False, float('inf')

    def benchmark_server(self, dns_server: str, name: str = None) -> Dict:
        """Benchmark a single DNS server"""
        if name is None:
            name = dns_server
            
        if self.verbose:
            print(f"Testing {name} ({dns_server})...")
        
        successful_queries = []
        failed_queries = 0
        
        # Use limited concurrency to avoid overwhelming the DNS server
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_domain = {
                executor.submit(self.query_dns, domain, dns_server): domain 
                for domain in self.test_domains
            }
            
            for future in as_completed(future_to_domain):
                domain = future_to_domain[future]
                try:
                    success, response_time = future.result()
                    if success and response_time != float('inf'):
                        successful_queries.append(response_time)
                        if self.verbose:
                            print(f"  {domain}: {response_time:.1f}ms")
                    else:
                        failed_queries += 1
                        if self.verbose:
                            print(f"  {domain}: FAILED")
                except Exception:
                    failed_queries += 1
        
        # Calculate statistics
        total_queries = len(self.test_domains)
        if successful_queries:
            stats = {
                'avg_time': statistics.mean(successful_queries),
                'min_time': min(successful_queries),
                'max_time': max(successful_queries),
                'median_time': statistics.median(successful_queries),
            }
        else:
            stats = {
                'avg_time': float('inf'),
                'min_time': float('inf'),
                'max_time': float('inf'),
                'median_time': float('inf'),
            }
        
        return {
            'name': name,
            'server': dns_server,
            'success_rate': (len(successful_queries) / total_queries) * 100,
            'successful_queries': len(successful_queries),
            'failed_queries': failed_queries,
            **stats
        }

    def run_benchmark(self, test_current=True, test_public=True, custom_servers=None):
        """Run the complete benchmark"""
        # Check available tools
        self.dig_available = self.check_command('dig')
        nslookup_available = self.check_command('nslookup')
        
        if not self.dig_available and not nslookup_available:
            print("Error: Neither 'dig' nor 'nslookup' command found!")
            print("Please install dnsutils (Ubuntu/Debian) or bind-utils (CentOS/RHEL)")
            return []
        
        print("=== DNS Benchmark Tool ===")
        if not self.verbose:
            print("(Use --verbose for detailed query results)")
        
        # Detect current DNS servers
        current_dns = self.get_current_dns_servers() if test_current else []
        
        if current_dns:
            print(f"\nCurrent DNS servers detected: {', '.join(current_dns)}")
        elif test_current:
            print("\nWarning: Could not detect current DNS servers")
        
        # Prepare server list
        servers_to_test = []
        
        if test_current:
            for server in current_dns:
                servers_to_test.append((f"Current-{server}", server))
        
        if custom_servers:
            for server in custom_servers:
                servers_to_test.append((f"Custom-{server}", server))
        
        if test_public:
            servers_to_test.extend(self.public_dns_servers.items())
        
        if not servers_to_test:
            print("No DNS servers to test!")
            return []
        
        print(f"\nTesting {len(servers_to_test)} DNS servers with {len(self.test_domains)} domains...")
        if not self.verbose:
            print("Progress: ", end="", flush=True)
        
        # Run benchmarks
        results = []
        for i, (name, server) in enumerate(servers_to_test):
            if not self.verbose:
                print(".", end="", flush=True)
            
            try:
                result = self.benchmark_server(server, name)
                results.append(result)
            except KeyboardInterrupt:
                print("\nBenchmark interrupted!")
                break
            except Exception as e:
                if self.verbose:
                    print(f"Failed to test {name}: {e}")
        
        if not self.verbose:
            print(" Done!")
        
        return results

    def print_results(self, results: List[Dict]):
        """Print formatted results"""
        if not results:
            return
        
        # Sort by average response time
        valid_results = [r for r in results if r['avg_time'] != float('inf')]
        failed_results = [r for r in results if r['avg_time'] == float('inf')]
        
        valid_results.sort(key=lambda x: x['avg_time'])
        
        print(f"\n{'='*75}")
        print("DNS BENCHMARK RESULTS")
        print(f"{'='*75}")
        
        if valid_results:
            print(f"{'#':<2} {'DNS Server':<20} {'Success':<8} {'Avg':<8} {'Min':<8} {'Max':<8} {'Median':<8}")
            print("-" * 75)
            
            for i, r in enumerate(valid_results, 1):
                print(f"{i:<2} {r['name'][:19]:<20} "
                      f"{r['success_rate']:.1f}%{'':<4} "
                      f"{r['avg_time']:.1f}ms{'':<3} "
                      f"{r['min_time']:.1f}ms{'':<3} "
                      f"{r['max_time']:.1f}ms{'':<3} "
                      f"{r['median_time']:.1f}ms")
        
        if failed_results:
            print(f"\nFailed DNS servers:")
            for r in failed_results:
                print(f"  ✗ {r['name']} - {r['failed_queries']}/{r['failed_queries'] + r['successful_queries']} queries failed")
        
        # Recommendations
        if valid_results:
            best = valid_results[0]
            print(f"\n🏆 Best performing DNS server:")
            print(f"   {best['name']} ({best['server']})")
            print(f"   Average: {best['avg_time']:.1f}ms, Success: {best['success_rate']:.1f}%")
            
            # Compare with current DNS
            current_results = [r for r in valid_results if r['name'].startswith('Current-')]
            if current_results and len(valid_results) > 1:
                current_best = current_results[0]
                current_rank = next(i for i, r in enumerate(valid_results, 1) if r == current_best)
                if current_rank > 1:
                    improvement = ((current_best['avg_time'] - best['avg_time']) / current_best['avg_time']) * 100
                    print(f"\n💡 Your current DNS ranks #{current_rank}")
                    print(f"   Switching to {best['name']} could improve speed by {improvement:.1f}%")

    def check_command(self, command: str) -> bool:
        """Check if a command is available"""
        try:
            subprocess.run([command, '--help'], capture_output=True, timeout=2)
            return True
        except:
            try:
                subprocess.run([command], capture_output=True, timeout=2)
                return True
            except:
                return False

def main():
    parser = argparse.ArgumentParser(
        description="DNS Benchmark Tool - Test DNS server performance",
        epilog="""
Examples:
  dns-bench                    # Test current + public DNS servers
  dns-bench --current-only     # Test only current DNS servers  
  dns-bench --public-only      # Test only public DNS servers
  dns-bench --custom 1.1.1.1 8.8.8.8  # Test custom servers
        """
    )
    
    parser.add_argument('--current-only', action='store_true',
                       help='Test only current DNS servers')
    parser.add_argument('--public-only', action='store_true', 
                       help='Test only public DNS servers')
    parser.add_argument('--custom', nargs='+', metavar='SERVER',
                       help='Test custom DNS servers')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed query results')
    
    args = parser.parse_args()
    
    benchmark = DNSBenchmark(verbose=args.verbose)
    
    test_current = not args.public_only
    test_public = not args.current_only
    
    results = benchmark.run_benchmark(
        test_current=test_current,
        test_public=test_public, 
        custom_servers=args.custom
    )
    
    benchmark.print_results(results)

if __name__ == "__main__":
    main()
EOF

# Install the script
echo "Installing script to $INSTALL_DIR/$SCRIPT_NAME..."
$SUDO mv /tmp/dns_bench_final.py "$INSTALL_DIR/$SCRIPT_NAME"
$SUDO chmod +x "$INSTALL_DIR/$SCRIPT_NAME"

echo
echo "✅ Installation complete!"
echo
echo "Usage examples:"
echo "  $SCRIPT_NAME                    # Test current + public DNS servers"
echo "  $SCRIPT_NAME --current-only     # Test only current DNS servers"
echo "  $SCRIPT_NAME --verbose          # Show detailed results"
echo "  $SCRIPT_NAME --custom 1.1.1.1   # Test custom DNS server"
echo
echo "The tool will automatically detect your current DNS servers and"
echo "compare them against popular public DNS servers like Cloudflare,"
echo "Google, Quad9, and OpenDNS."
EOF
