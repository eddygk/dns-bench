#!/usr/bin/env python3
"""
DNS Benchmark Tool for Linux
Industry-standard DNS benchmarking - automatically detects current DNS servers
and benchmarks them against popular public DNS servers.
"""

import subprocess
import time
import statistics
import sys
import argparse
import re
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Optional

class DNSBenchmark:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.test_domains = [
            'google.com', 'facebook.com', 'youtube.com', 'amazon.com',
            'wikipedia.org', 'twitter.com', 'instagram.com', 'linkedin.com',
            'github.com', 'stackoverflow.com', 'reddit.com', 'netflix.com',
            'apple.com', 'microsoft.com', 'cloudflare.com', 'baidu.com',
            'yahoo.com', 'ebay.com', 'cnn.com', 'bbc.com',
            'spotify.com', 'zoom.us', 'adobe.com', 'oracle.com'
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

        self.top3_dns_servers = {
            'Cloudflare': '1.1.1.1',
            'Google': '8.8.8.8',
            'Quad9': '9.9.9.9'
        }

    def validate_ip_address(self, ip: str) -> bool:
        """Validate IPv4 and IPv6 addresses"""
        # IPv4 pattern
        ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        # Basic IPv6 pattern (simplified)
        ipv6_pattern = r'^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$'

        if re.match(ipv4_pattern, ip):
            # Additional IPv4 validation
            parts = ip.split('.')
            return all(0 <= int(part) <= 255 for part in parts)
        elif re.match(ipv6_pattern, ip):
            return True
        return False

    def get_current_dns_servers(self) -> List[str]:
        """Get current DNS servers from system configuration"""
        dns_servers = []
        seen_servers = set()  # Track unique servers

        # Method 1: /etc/resolv.conf
        try:
            with open('/etc/resolv.conf', 'r') as f:
                for line in f:
                    if line.strip().startswith('nameserver'):
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            server = parts[1]
                            if self.validate_ip_address(server) and not server.startswith('127.'):
                                if server not in seen_servers:
                                    dns_servers.append(server)
                                    seen_servers.add(server)
        except Exception as e:
            if self.verbose:
                print(f"Could not read /etc/resolv.conf: {e}")

        # Method 2: systemd-resolve/resolvectl
        for cmd in ['systemd-resolve --status', 'resolvectl status']:
            try:
                result = subprocess.run(cmd.split(), capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    lines = result.stdout.split('\n')
                    for i, line in enumerate(lines):
                        if 'DNS Servers:' in line or 'DNS Server:' in line:
                            # Extract from current line if present
                            if ':' in line:
                                server_part = line.split(':', 1)[1].strip()
                                # Handle multiple servers on same line
                                for server in server_part.split():
                                    if self.validate_ip_address(server) and not server.startswith('127.'):
                                        if server not in seen_servers:
                                            dns_servers.append(server)
                                            seen_servers.add(server)

                            # Check following lines for additional servers
                            for j in range(i + 1, min(i + 10, len(lines))):
                                next_line = lines[j].strip()
                                if next_line and not any(x in next_line for x in [':', '=', 'Domain']):
                                    # This might be a DNS server
                                    for server in next_line.split():
                                        if self.validate_ip_address(server) and not server.startswith('127.'):
                                            if server not in seen_servers:
                                                dns_servers.append(server)
                                                seen_servers.add(server)
                                elif any(x in next_line for x in [':', '=']):
                                    # We've hit another section
                                    break
            except Exception as e:
                if self.verbose:
                    print(f"Could not run {cmd}: {e}")

        # Method 3: nmcli
        try:
            result = subprocess.run(['nmcli', 'dev', 'show'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'IP4.DNS' in line or 'IP6.DNS' in line:
                        if ':' in line:
                            server = line.split(':', 1)[1].strip()
                            if self.validate_ip_address(server) and not server.startswith('127.'):
                                if server not in seen_servers:
                                    dns_servers.append(server)
                                    seen_servers.add(server)
        except Exception as e:
            if self.verbose:
                print(f"Could not run nmcli: {e}")

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
                    'nslookup', '-timeout=2', domain, dns_server
                ], capture_output=True, text=True, timeout=3)

            end_time = time.time()
            response_time = (end_time - start_time) * 1000

            if result.returncode == 0:
                if self.dig_available:
                    success = bool(result.stdout.strip())
                else:
                    success = 'NXDOMAIN' not in result.stdout and 'can\'t find' not in result.stdout and result.stdout.strip()
                return success, response_time if success else float('inf')

            return False, float('inf')

        except subprocess.TimeoutExpired:
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
            print(f"\nTesting {name} ({dns_server})...")

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

    def run_benchmark(self, test_current=True, test_public=True, custom_servers=None, top3_only=False):
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
            print(f"\nCurrent DNS servers detected:")
            for i, server in enumerate(current_dns, 1):
                print(f"  {i}. {server}")
        elif test_current:
            print("\nWarning: Could not detect current DNS servers")
            print("(This is normal if you're using localhost DNS like 127.0.0.53)")

        # Prepare server list
        servers_to_test = []

        if test_current:
            for server in current_dns:
                servers_to_test.append((f"Current-{server}", server))

        if custom_servers:
            for server in custom_servers:
                if self.validate_ip_address(server):
                    servers_to_test.append((f"Custom-{server}", server))
                else:
                    print(f"Warning: Invalid IP address '{server}' - skipping")

        if test_public:
            if top3_only:
                servers_to_test.extend(self.top3_dns_servers.items())
            else:
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

    def print_results(self, results: List[Dict], json_output: bool = False):
        """Print formatted results"""
        if not results:
            return

        if json_output:
            print(json.dumps(results, indent=2))
            return

        # Sort by average response time
        valid_results = [r for r in results if r['avg_time'] != float('inf')]
        failed_results = [r for r in results if r['avg_time'] == float('inf')]

        valid_results.sort(key=lambda x: x['avg_time'])

        print(f"\n{'='*80}")
        print("DNS BENCHMARK RESULTS")
        print(f"{'='*80}")

        if valid_results:
            print(f"{'#':<3} {'DNS Server':<25} {'Success':<10} {'Avg':<10} {'Min':<10} {'Max':<10} {'Median':<10}")
            print("-" * 80)

            for i, r in enumerate(valid_results, 1):
                print(f"{i:<3} {r['name'][:24]:<25} "
                      f"{r['success_rate']:.1f}%{'':<5} "
                      f"{r['avg_time']:.1f}ms{'':<4} "
                      f"{r['min_time']:.1f}ms{'':<4} "
                      f"{r['max_time']:.1f}ms{'':<4} "
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
                else:
                    print(f"\n✅ Your current DNS is already the fastest!")

    def check_command(self, command: str) -> bool:
        """Check if a command is available"""
        try:
            subprocess.run(['which', command], capture_output=True, check=True)
            return True
        except:
            return False

def main():
    parser = argparse.ArgumentParser(
        description="DNS Benchmark Tool - Test DNS server performance",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  dns-bench                    # Test current + all public DNS servers
  dns-bench --top3             # Quick test: current + top 3 providers
  dns-bench --current-only     # Test only current DNS servers
  dns-bench --public-only      # Test only public DNS servers
  dns-bench --custom 1.1.1.1 8.8.8.8  # Test custom servers
  dns-bench --json             # Output results in JSON format
        """
    )

    parser.add_argument('--top3', action='store_true',
                       help='Quick test against top 3 public DNS (Cloudflare, Google, Quad9)')
    parser.add_argument('--current-only', action='store_true',
                       help='Test only current DNS servers')
    parser.add_argument('--public-only', action='store_true',
                       help='Test only public DNS servers')
    parser.add_argument('--custom', nargs='+', metavar='SERVER',
                       help='Test custom DNS servers (IPv4 or IPv6)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed query results')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')

    args = parser.parse_args()

    # Handle conflicting options
    if args.top3 and args.public_only:
        print("Note: --top3 takes precedence over --public-only")
        args.public_only = False

    benchmark = DNSBenchmark(verbose=args.verbose)

    test_current = not args.public_only
    test_public = not args.current_only

    results = benchmark.run_benchmark(
        test_current=test_current,
        test_public=test_public,
        custom_servers=args.custom,
        top3_only=args.top3
    )

    benchmark.print_results(results, json_output=args.json)

if __name__ == "__main__":
    main()