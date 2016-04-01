
'use strict';

const WebSocketServer = require('websocket').server;
const http = require('http');
const port = process.env.PORT || 1337;
const moment = require('moment');
const _ = require('lodash');

const httpServer = http.createServer((request, response) => {});
httpServer.listen(port, () => log(`Server is listening on port ${port}`));
const server = new WebSocketServer({ httpServer: httpServer });

let slaves = {};
let yaks = {};

server.on('request', (request) => {
  log(`Received connection request from origin ${request.origin}`);

  if (true) {
    request.accept(null, request.origin);
  }
  else {
    request.reject();
  }
});

server.on('connect', (connection) => {
  let id = `slave-${Date.now()}`;
  slaves[id] = connection;
  connection.sendUTF(JSON.stringify({ key: 'id', value: id }));

  log(`New slave connected, assigning id to ${id}`);
  log(`Connected slaves:`, _.keys(slaves));

  yik();

  connection.on('message', (message) => {
    if (message.type === 'utf8') {
      let data = JSON.parse(message.utf8Data);
      console.log(`[${id}] sent:`, data);

      switch (data.key) {
        case 'yik': yik(); break;
        case 'yak': yak(id, data.value); break;
        case 'stop': stopAll(); break;
        case 'seek': seekAll(data.value); break;
      }
    }
  });

  connection.on('close', (connection, closeReason, description) => {
    delete slaves[id];
    console.log(`[${id}] Connection closed:`, connection, closeReason, description);
    console.log(`Connected slaves:`, _.keys(slaves));
  });
})

/**
 * Broadcasts a yik to all slaves and asks for a time report.
 */
function yik() {
  broadcast({ key: 'yik' });
}

/**
 * Stores received yaks and broadcasts a yak to all slaves when at least 1 yak
 * is received from every connected slave.
 * @param {string} id    - ID of the slave that sent the yak.
 * @param {number} value - Time value enclosed in the yak.
 */
function yak(id, value) {
  yaks[id] = value;

  if (_.size(yaks) === _.size(slaves)) {
    let max = 0;

    for (let k in yaks) {
      let v = yaks[k];
      if (v !== null && v > max) max = v;
    }

    yaks = {};
    broadcast({ key: 'seek', value: max });
  }
}

/**
 * Stops all slaves from playing their target videos.
 */
function stopAll() {
  broadcast({ key: 'stop' });
}

/**
 * Notifies all slaves to seek to a certain point in their target videos.
 * @param {number} val - Value between 0-1 representing the progress of the
 *                       video duration.
 */
function seekAll(val) {
  broadcast({ key: 'seek', value: val });
}

/**
 * Broadcasts a message to all slaves in the form of an object literal.
 * @param {Object} message
 */
function broadcast(message) {
  for (let id in slaves) {
    let slave = slaves[id];
    slave.sendUTF(JSON.stringify(message));
  }
}

/**
 * Custom logger.
 * @param {*} ..args
 */
function log() {
  let args = Array.prototype.slice.call(arguments);
  args.unshift(`[${moment().format('YY/MM/DD hh:mm:ss')}]`);
  Function.apply.call(console.log, console, args);
}
