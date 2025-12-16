// STUN/TURN SERVER
const Turn = require('node-turn');
const turnServer = new Turn({
  authMech: 'long-term',
  credentials: {
    test: 'test'
  },
  listeningPort : 3478,
  maxAllocateLifetime : 7200,
  debugLevel : 'INFO'
})

turnServer.start();
console.log("[TURN/STUN] Server is running on port 3478")

// HTTPS SERVER
const fs = require('fs');
const path = require('path');
const https = require('https');

const port = 8443; // HTTPS default port (can use 8080 if preferred)
const certDir = path.join(__dirname, 'certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Check if certificates exist
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('\n✗ SSL certificates not found!');
    console.error('Please run: node generate-cert.js');
    console.error('Or: npm run generate-cert\n');
    process.exit(1);
}

// Load SSL certificates
let options;
try {
    options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    console.log('✓ SSL certificates loaded successfully');
} catch (err) {
    console.error('\n✗ Failed to load SSL certificates:', err.message);
    console.error('Please regenerate certificates: npm run generate-cert\n');
    process.exit(1);
}
 
// We use a HTTPS server for serving static pages. In the real world you'll
// want to separate the signaling server and how you serve the HTML/JS, the
// latter typically through a CDN.
const server = https.createServer(options);

// Add error handling
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n✗ Port ${port} is already in use!`);
        console.error('Please stop the other application or change the port.\n');
    } else if (err.code === 'EACCES') {
        console.error(`\n✗ Permission denied on port ${port}!`);
        console.error('You may need administrator privileges.\n');
    } else {
        console.error('\n✗ Server error:', err.message);
        console.error(err);
    }
    process.exit(1);
});

server.listen(port, '0.0.0.0');
server.on('listening', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    // Find the first non-internal IPv4 address
    for (const name of Object.keys(networkInterfaces)) {
        for (const iface of networkInterfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
        if (localIP !== 'localhost') break;
    }
    
    // Get all IP addresses for better visibility
    const allIPs = [];
    for (const name of Object.keys(networkInterfaces)) {
        for (const iface of networkInterfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                allIPs.push({name, address: iface.address});
            }
        }
    }
    
    console.log('\n========================================');
    console.log('HTTPS Server is running!');
    console.log('========================================');
    console.log('Local access: https://localhost:' + port);
    console.log('\nNetwork access (use on other devices):');
    allIPs.forEach(({name, address}) => {
        console.log(`  - https://${address}:${port} (${name})`);
    });
    console.log('\n⚠️  Note: You will see a security warning for self-signed certificates.');
    console.log('   Click "Advanced" → "Proceed to localhost (unsafe)" to continue.');
    console.log('\n💡 Tip: Use the IP address that matches your Wi-Fi/Ethernet network');
    console.log('   (not VirtualBox or other virtual adapters)');
    console.log('========================================\n');
});
server.on('request', (request, response) => {
    // Add security headers
    const headers = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
    
    // Parse URL to handle query strings and fragments
    // Handle cases where URL might not have a host
    let pathname = request.url.split('?')[0].split('#')[0]; // Simple pathname extraction
    try {
        if (request.headers.host) {
            const url = new URL(request.url, `https://${request.headers.host}`);
            pathname = url.pathname;
        }
    } catch (e) {
        // Fallback to simple parsing if URL constructor fails
        pathname = request.url.split('?')[0].split('#')[0];
    }
    
    // Log requests for debugging (skip favicon requests)
    if (!pathname.includes('favicon')) {
        console.log(`${new Date().toISOString()} - ${request.method} ${pathname}`);
    }
    
    // Simple connectivity test endpoint
    if (pathname === '/test' || pathname === '/test/') {
        response.writeHead(200, {
            ...headers,
            'Content-Type': 'application/json'
        });
        response.end(JSON.stringify({
            status: 'ok',
            message: 'HTTPS server is reachable!',
            timestamp: new Date().toISOString(),
            protocol: 'https'
        }));
        return;
    }
    
    const urlToPath = {
        '/new.html' : 'new.html',
        '/send.html' : 'send.html',
        '/receive.html' : 'receive.html'
    };
    const urlToContentType = {
        '/new.html' : 'text/html',
        '/send.html' : 'text/html',
        '/receive.html' : 'text/html'
    };
    const filename = urlToPath[pathname];
    if (!filename) {
        // Silently ignore favicon requests
        if (pathname.includes('favicon')) {
            response.writeHead(204, headers);
            response.end();
            return;
        }
        console.log(`404 - File not found: ${pathname}`);
        response.writeHead(404, headers);
        response.end();
        return;
    }
    fs.readFile(filename, (err, data) => {
        if (err) {
            console.log(`404 - Could not read file ${filename}:`, err.message);
            response.writeHead(404, headers);
            response.end();
            return;
        }
        response.writeHead(200, {
            ...headers,
            'Content-Type': urlToContentType[pathname]
        });
        response.end(data);
    });
});

// SIGNALING SERVER
const WebSocket = require('ws');

const wssServer = https.createServer({ 
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
});

const wsServer = new WebSocket.Server({server : wssServer});
wssServer.listen(3000);

const wsClients = new Set();

wsServer.on('connection', ws => {
  wsClients.add(ws);

  ws.on('message', message => {
    for (const client of wsClients) {
      if (client !== ws && client.readyState === WebSocket.OPEN ) {
        client.send(message.toString());
      }
    }
    console.log(`[SIGNALING] ${message.toString()}`);
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });

});
console.log("[SIGNALING] WebSocket Server is running on port 3000")



