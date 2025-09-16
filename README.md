# DNS Bench Linux

A comprehensive DNS benchmarking tool for Linux that mimics Steve Gibson's DNS Bench functionality. Automatically detects your current DNS servers and benchmarks their performance against popular public DNS servers.

![DNS Bench Linux Demo](https://img.shields.io/badge/Platform-Linux-blue) ![Python](https://img.shields.io/badge/Python-3.6+-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Features

- **🔍 Automatic DNS Detection** - Detects current DNS servers from multiple sources (resolv.conf, systemd-resolved, NetworkManager)
- **⚡ Performance Benchmarking** - Tests response times across 24 diverse domains
- **🌐 Public DNS Comparison** - Includes 10 popular public DNS servers (Cloudflare, Google, Quad9, etc.)
- **🎯 Quick Testing** - New `--top3` option for fast comparison against top providers
- **📊 Statistical Analysis** - Provides avg, min, max, median response times and success rates
- **🔧 Flexible Options** - Test current, public, or custom DNS servers
- **📈 Performance Insights** - Get optimization recommendations
- **🛡️ Input Validation** - Robust IPv4/IPv6 address validation and duplicate filtering

## 🚀 Quick Start

### Installation

```bash
# Download and run the installer
curl -o install_dns_bench.sh https://raw.githubusercontent.com/your-repo/dns-bench-linux/main/install_dns_bench.sh
chmod +x install_dns_bench.sh
sudo ./install_dns_bench.sh
```

Or manually:
```bash
# Install dependencies
sudo apt-get install dnsutils python3

# Install the tool
sudo cp dns_bench_linux.py /usr/local/bin/dns-bench
sudo chmod +x /usr/local/bin/dns-bench
```

### Basic Usage

```bash
# Quick comparison (recommended)
dns-bench --top3

# Full benchmark against all public DNS servers
dns-bench

# Test only your current DNS configuration
dns-bench --current-only

# Verbose output with detailed timing
dns-bench --verbose
```

## 📊 Sample Output

```
=== DNS Benchmark Tool ===

Current DNS servers detected:
  1. 192.168.1.1
  2. 8.8.8.8

Testing 5 DNS servers with 24 domains...
Progress: ..... Done!

===============================================================================
DNS BENCHMARK RESULTS
===============================================================================
#  DNS Server               Success  Avg      Min      Max      Median   
-------------------------------------------------------------------------------
1  Cloudflare               100.0%   8.2ms    5.1ms    15.3ms   7.8ms
2  Google                   100.0%   12.4ms   8.2ms    22.1ms   11.9ms
3  Current-192.168.1.1      98.8%    15.6ms   9.4ms    45.2ms   14.1ms
4  Quad9                    100.0%   18.9ms   12.3ms   28.7ms   17.2ms
5  Current-8.8.8.8          100.0%   12.4ms   8.2ms    22.1ms   11.9ms

🏆 Best performing DNS server:
   Cloudflare (1.1.1.1)
   Average: 8.2ms, Success: 100.0%

💡 Your current DNS ranks #3
   Switching to Cloudflare could improve speed by 47.4%
```

## 🛠️ Usage Options

### Command Line Arguments

| Option | Description |
|--------|-------------|
| `--top3` | Test current DNS + top 3 public DNS (Cloudflare, Google, Quad9) |
| `--current-only` | Test only currently configured DNS servers |
| `--custom SERVER [SERVER ...]` | Test custom DNS servers |
| `--verbose, -v` | Show detailed query results for each domain |
| `--json` | Output results in JSON format |
| `--help` | Show help message and examples |

### Examples

```bash
# Quick comparison against top 3 public DNS providers
dns-bench --top3

# Test only your current DNS setup
dns-bench --current-only

# Test specific DNS servers
dns-bench --custom 1.1.1.1 8.8.8.8 9.9.9.9

# Full benchmark with detailed output
dns-bench --verbose

# Get results in JSON format for scripting
dns-bench --json > dns_results.json
```

## 🔍 How It Works

### DNS Server Detection

The tool automatically detects your current DNS servers from multiple sources:

1. **`/etc/resolv.conf`** - Standard DNS configuration file
2. **systemd-resolved** - Modern Linux DNS resolver (`systemd-resolve` / `resolvectl`)
3. **NetworkManager** - Network configuration manager (`nmcli`)

Works with both **static** and **DHCP** DNS configurations.

### Test Methodology

- **24 diverse test domains** including popular sites, international domains, and cache-miss scenarios
- **Concurrent queries** with configurable timeout (default: 2 seconds)
- **Statistical analysis** with outlier handling
- **Success rate tracking** for reliability assessment

### Included Public DNS Servers

| Provider | Primary | Secondary | Features |
|----------|---------|-----------|----------|
| **Cloudflare** | 1.1.1.1 | 1.0.0.1 | Fast, privacy-focused |
| **Google** | 8.8.8.8 | 8.8.4.4 | Reliable, widely used |
| **Quad9** | 9.9.9.9 | 149.112.112.112 | Security-focused, malware blocking |
| **OpenDNS** | 208.67.222.222 | 208.67.220.220 | Content filtering options |
| **Level3** | 4.2.2.1 | 4.2.2.2 | ISP-grade reliability |

## 📋 Requirements

- **Linux** (Ubuntu, Debian, CentOS, Fedora, Arch, etc.)
- **Python 3.6+** (usually pre-installed)
- **dnsutils** package (`dig` command)
  ```bash
  # Ubuntu/Debian
  sudo apt-get install dnsutils
  
  # CentOS/RHEL
  sudo yum install bind-utils
  
  # Fedora
  sudo dnf install bind-utils
  
  # Arch Linux
  sudo pacman -S bind-tools
  ```

## 🔧 Advanced Usage

### Configuration Detection

The tool can detect DNS servers from various network configurations:

- **Static IP configurations** (netplan, /etc/network/interfaces)
- **DHCP configurations** (automatic DNS assignment)
- **NetworkManager profiles** (desktop environments)
- **systemd-resolved configurations** (modern Linux systems)

### Filtering and Validation

- **Automatic deduplication** of DNS servers from multiple sources
- **IPv4/IPv6 validation** with regex pattern matching
- **Localhost filtering** (excludes 127.x.x.x addresses)
- **Invalid input rejection** with helpful error messages

### Output Formats

```bash
# Human-readable table (default)
dns-bench

# JSON for scripting/automation
dns-bench --json

# Verbose with per-domain timing
dns-bench --verbose
```

## 🐛 Troubleshooting

### Common Issues

**"dig command not found"**
```bash
sudo apt-get install dnsutils
```

**"Could not detect current DNS servers"**
- Check if you're using localhost DNS (127.x.x.x)
- Try `--verbose` for detailed error information
- Manually specify servers with `--custom`

**Permission errors**
```bash
# Run with sudo if accessing network configs fails
sudo dns-bench
```

**Slow performance**
- Some DNS servers may have high latency
- Use `--current-only` to test only local servers
- Check your internet connection

### Debug Mode

```bash
# Show detailed detection and query information
dns-bench --verbose

# Test DNS detection only
python3 -c "
from dns_bench_linux import DNSBenchmark
benchmark = DNSBenchmark(verbose=True)
servers = benchmark.get_current_dns_servers()
print('Detected servers:', servers)
"
```

## 🔄 Updating

To update to the latest version:

```bash
# Using the update script
./update_dns_bench.sh

# Or manually
sudo cp dns_bench_linux.py /usr/local/bin/dns-bench
sudo chmod +x /usr/local/bin/dns-bench
```

## 📈 Performance Tips

### Optimization Recommendations

1. **Use the fastest DNS server** from your benchmark results
2. **Consider geographic proximity** - closer servers are often faster
3. **Test at different times** - performance can vary by time of day
4. **Check multiple providers** - some excel at different domain types
5. **Consider security features** - Quad9 blocks malware, OpenDNS offers filtering

### DNS Configuration

**Ubuntu/Debian with netplan:**
```yaml
# /etc/netplan/01-network-manager-all.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

**systemd-resolved:**
```bash
# Edit /etc/systemd/resolved.conf
DNS=1.1.1.1 8.8.8.8
sudo systemctl restart systemd-resolved
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
git clone https://github.com/your-repo/dns-bench-linux.git
cd dns-bench-linux
python3 dns_bench_linux.py --help
```

### Adding Features

- **New DNS providers** - Add to `public_dns_servers` dictionary
- **Test domains** - Extend `test_domains` list
- **Output formats** - Modify `print_results()` method
- **Detection methods** - Enhance `get_current_dns_servers()`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Steve Gibson's DNS Bench](https://www.grc.com/dns/benchmark.htm)
- Thanks to all public DNS providers for their free services
- Built with Python's excellent networking and subprocess libraries

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/dns-bench-linux/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/dns-bench-linux/discussions)

---

**⚡ Quick Start:** `dns-bench --top3` for instant DNS performance insights!
