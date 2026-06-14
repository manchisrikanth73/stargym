const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function handler(req, res) {
  let filePath = path.join(DIST, req.url === '/' ? '/index.html' : req.url);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const options = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  https.createServer(options, handler).listen(PORT, '0.0.0.0', () => {
    console.log(`\n  StarGym is running over HTTPS!\n`);
    console.log(`  Open on your iPhone: https://192.168.1.110:${PORT}\n`);
    console.log(`  (Accept the security warning on first visit)\n`);
  });
} else {
  http.createServer(handler).listen(PORT, '0.0.0.0', () => {
    console.log(`\n  StarGym is running!\n`);
    console.log(`  Open on your iPhone: http://192.168.1.110:${PORT}\n`);
    console.log(`  Note: Live QR scanner needs HTTPS. Run: npm run gen-cert\n`);
  });
}
