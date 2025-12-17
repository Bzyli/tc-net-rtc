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

// SIGNALING SERVER
const WebSocket = require('ws');

const wsServer = new WebSocket.Server({port : 3000});

const wsClients = new Set();

wsServer.on('connection', ws => {
  wsClients.add(ws);

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      console.log(message.roomID)
    } catch (e) {
      console.log('[SIGNALING] JSON error' + e);
    }

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