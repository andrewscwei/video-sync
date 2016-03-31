
'use strict';

const WebSocketServer = require('websocket').server;
const http = require('http');
const port = process.env.PORT || 1337;

const httpServer = http.createServer((request, response) => {});
httpServer.listen(port, () => console.log(`[${new Date()}] Server is listening on port ${port}`));
const server = new WebSocketServer({ httpServer: httpServer });

let slaves = {};

server.on('request', (request) => {
  request.accept(null, request.origin);
});

server.on('connect', (connection) => {
  let id = `slave-${Date.now()}`;
  slaves[id] = connection;
  console.log(`New slave connected, assigning id to ${id}`);
  connection.sendUTF(JSON.stringify({ key: 'id', value: id }));

  connection.on('message', (message) => {
    if (message.type === 'utf8') {
      let data = JSON.parse(message.utf8Data);
      console.log(`[${id}] sent:`, data);

      switch (data.key) {
        case 'toggle':
          broadcast({ key: 'toggle' });
          break;
        case 'stop':
          broadcast({ key: 'stop' });
          break;
        case 'seek':
          broadcast({ key: 'seek', value: data.value });
          break;
        default:
          // Do nothing
      }
    }
  });

  connection.on('close', (connection, closeReason, description) => {
    console.log(`[${id}] Connection closed:`, connection, closeReason, description);
  });
})

function broadcast(data) {
  for (let id in slaves) {
    let slave = slaves[id];
    slave.sendUTF(JSON.stringify(data));
  }
}
