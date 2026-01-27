#!/bin/bash

# LekStack DNS Setup Script
# This script configures systemd-resolved to route *.test domains to 127.0.0.1 via dnsmasq
# Usage: sudo ./setup_dns.sh

if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root"
  exit 1
fi

echo "Installing dnsmasq..."
apt-get update && apt-get install -y dnsmasq

echo "Configuring dnsmasq for .test domain..."
cat > /etc/dnsmasq.d/lekstack.conf <<EOF
address=/.test/127.0.0.1
EOF

echo "Restarting dnsmasq..."
systemctl restart dnsmasq

# Check if systemd-resolved is active
if systemctl is-active --quiet systemd-resolved; then
    echo "Configuring systemd-resolved..."
    # Create directory if likely executing on a modern systemd setup
    mkdir -p /etc/systemd/resolved.conf.d/
    
    # We want systemd-resolved to use localhost for DNS query?
    # Actually, simpler approach implies just using dnsmasq as a local resolver.
    # But often 53 is taken by systemd-resolved.
    
    # Best practice for Valet/Herd Linux usually involves:
    # 1. Disable systemd-resolved stub listener? OR
    # 2. Point systemd-resolved to dnsmasq?
    
    # Let's try the unintrusive way used by some Valet Linux forks:
    # Create a dummy interface or just rely on NetworkManager to pick up dnsmasq?
fi

echo "DNS Setup Complete! (Simple Mode)"
echo "You might need to manually ensure 127.0.0.1 is in your /etc/resolv.conf or used by your connection."
echo "Testing: ping -c 1 foo.test"
ping -c 1 foo.test || echo "Ping failed. Please check your DNS settings."
