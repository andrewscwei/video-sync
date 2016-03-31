
'use strict';

import 'stylesheets/main';
import _ from 'lodash';
import { w3cwebsocket as WebSocket } from 'websocket';

const video = document.getElementById('screensaver');

let id = 'slave-?';
let pending = null;
let connection;

document.getElementById('toggle').addEventListener('click', (event) => send({ key: 'toggle' }));
document.getElementById('stop').addEventListener('click', (event) => send({ key: 'stop' }));
document.getElementById('seek').addEventListener('click', (event) => send({ key: 'seek', value: _.random(0, 1, true) }));

connect();

function connect() {
  if (connection && connection.readyState === 3) {
    connection.removeEventListener('open', onOpen);
    connection.removeEventListener('error', onError);
    connection.removeEventListener('message', onMessage);
    connection = null;
  }

  if (!connection) {
    connection = new WebSocket('ws://localhost:1337');
    connection.addEventListener('open', onOpen);
    connection.addEventListener('error', onError);
    connection.addEventListener('message', onMessage);
  }
}

function send(data) {
  pending = data;

  connect();

  switch (connection.readyState) {
    case 1: // Open
      let message = JSON.stringify(pending);
      log('Sending message:', message);
      connection.send(message);
      pending = null;
      break;
    case 0: // Connecting
    case 2: // Closing
    case 3: // Closed
    default: // Unknown
      setTimeout(send, 100, data);
  }
}

function onOpen() {
  log(`Connection established`);
  if (pending) connection.send(JSON.stringify(pending));
}

function onError(error) {
  log(`Connection error`);
}

function onMessage(message) {
  try {
    let data = JSON.parse(message.data);
    let key = data.key;
    let value = data.value;

    switch (key) {
      case 'id':
        id = value;
        break;
      case 'toggle':
        toggle();
        break;
      case 'stop':
        stop();
        break;
      case 'seek':
        seek(value);
        break;
      default:
        // Do nothing
    }
  }
  catch (e) {
    log('This doesn\'t look like a valid JSON: ', message.data);
    return;
  }
}

function toggle() {
  log('toggle()');
  if (video.paused)
    video.play();
  else
    video.pause();
}

function stop() {
  log('stop()');
  video.pause();
  video.currentTime = 0;
}

function seek(value) {
  log(`seek(${value})`);
  video.currentTime = video.duration * value;
  video.play();
}

function log() {
  let args = Array.prototype.slice.call(arguments);
  args.unshift(`[${id}]`);
  Function.apply.call(console.log, console, args);
}

module.exports = log;
