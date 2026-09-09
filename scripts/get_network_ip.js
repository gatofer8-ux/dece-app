const os = require('os');
const interfaces = os.networkInterfaces();
const ips = [];
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      ips.push({ name, ip: iface.address, url: `http://${iface.address}:3000` });
    }
  }
}
console.log('Available Network IPs:', ips);
