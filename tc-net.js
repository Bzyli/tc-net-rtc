// STUN/TURN SERVER
const Turn = require('node-turn');

const turnServer = new Turn({
  authMech: 'long-term',
  credentials: {
    test: 'test'
  },
  listeningPort : 3478,
  maxAllocateLifetime : 7200,
  minPort: 49152,
  maxPort: 49250,
  debugLevel : 'INFO'
})

turnServer.start();
console.log("[TURN/STUN] Server is running on port 3478")

// SIGNALING SERVER
const WebSocket = require('ws');

const wsServer = new WebSocket.Server({port : 3000});

const wsClients = new Set();

wsServer.on('connection', ws => {
  wsClients.add(ws);

  ws.on('message', message => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log('[SIGNALING] JSON error' + e);
      return;
    }

    if (data.roomID) {
      ws.roomID = data.roomID;
      console.log(`[SIGNALING][ROOM : ${data.roomID}] ${message.toString()}`);
    }

    for (const client of wsClients) {
      if (client !== ws && client.readyState === WebSocket.OPEN && ws.roomID === client.roomID) {
        client.send(message.toString());
      }
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });

});
console.log("[SIGNALING] WebSocket Server is running on port 3000")

// API SERVER
const http = require('http');

const API_PORT = 3001;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }


  if (req.method === 'GET' && pathname === '/api/rooms') {
    const response = Array.from(wsClients).map(e => e.roomID).filter(roomID => roomID != null);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(API_PORT, () => {
  console.log(`[API] Running on port ${API_PORT}`);
});

