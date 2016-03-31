
'use strict';

import { w3cwebsocket as WebSocket } from 'websocket';
import _ from 'lodash';

const DEFAULT_CONNECTION_ID = 'slave-?';
const TARGET_ID = 'screensaver';
const WEBSOCKET_URL = 'ws://localhost:1337';

class VideoSynchronizer {
  get target() {
    if (!this.__target) this.__target = document.getElementById(TARGET_ID);
    return this.__target;
  }

  get connection() {
    if (this.__connection && this.__connection.readyState === 3) {
      this.__connection.removeEventListener('open', this.__connectionOpenHandler);
      this.__connection.removeEventListener('error', this.__connectionErrorHandler);
      this.__connection.removeEventListener('message', this.__connectionMessageHandler);
      this.__connection = null;
      this.__connectionOpenHandler = null;
      this.__connectionErrorHandler = null;
      this.__connectionMessageHandler = null;
    }

    if (!this.__connection) {
      this.__connection = new WebSocket(WEBSOCKET_URL);
      this.__connectionOpenHandler = this.onConnectionOpen.bind(this);
      this.__connectionErrorHandler = this.onConnectionError.bind(this);
      this.__connectionMessageHandler = this.onConnectionMessage.bind(this);
      this.__connection.addEventListener('open', this.__connectionOpenHandler);
      this.__connection.addEventListener('error', this.__connectionErrorHandler);
      this.__connection.addEventListener('message', this.__connectionMessageHandler);
    }

    return this.__connection;
  }

  get connectionId() { return this.__connectionId || DEFAULT_CONNECTION_ID; }
  set connectionId(val) { this.__connectionId = val; }

  get pendingMessage() { return this.__pendingMessage; }
  set pendingMessage(val) { this.__pendingMessage = val; }

  get paused() { return this.target ? this.target.paused : true; }
  get duration() { return this.target ? this.target.duration : 0; }

  constructor() {
    // Attempt a connection.
    this.log(this.connection);

    document.getElementById('toggle').addEventListener('click', (event) => this.sendMessage({ key: 'toggle' }));
    document.getElementById('stop').addEventListener('click', (event) => this.sendMessage({ key: 'stop' }));
    document.getElementById('seek').addEventListener('click', (event) => this.sendMessage({ key: 'seek', value: _.random(0, 1, true) }));
  }

  sendMessage(data) {
    this.pendingMessage = data;

    switch (this.connection.readyState) {
      case 1: // Open
        const message = JSON.stringify(this.pendingMessage);
        this.log('Sending message:', message);
        this.connection.send(message);
        this.pendingMessage = null;
        break;
      case 0: // Connecting
      case 2: // Closing
      case 3: // Closed
      default: // Unknown
        setTimeout(this.sendMessage, 100, data);
    }
  }

  play() {
    this.log('play()');
    this.target.play();
  }

  pause() {
    this.log('pause()');
    this.target.pause();
  }

  stop() {
    this.log('stop()');
    this.target.pause();
    this.target.currentTime = 0;
  }

  seek(val) {
    this.log(`seek(${val})`);
    this.target.currentTime = this.duration * val;
    this.target.play();
  }

  onConnectionOpen() {
    this.log(`Connection established`);
    if (this.pendingMessage) this.connection.send(JSON.stringify(this.pendingMessage));
  }

  onConnectionError(err) {
    this.log(`Connection error`);
  }

  onConnectionMessage(data) {
    try {
      let message = JSON.parse(data.data);
      let key = message.key;
      let value = message.value;

      switch (key) {
        case 'id':
          this.connectionId = value;
          break;
        case 'toggle':
          if (this.target.paused)
            this.play();
          else
            this.pause();
          break;
        case 'stop':
          this.stop();
          break;
        case 'seek':
          this.seek(value);
          break;
        default:
          // Do nothing
      }
    }
    catch (e) {
      this.log('This doesn\'t look like a valid JSON: ', data.data);
      return;
    }
  }

  log() {
    let args = Array.prototype.slice.call(arguments);
    args.unshift(`[${this.connectionId}]`);
    Function.apply.call(console.log, console, args);
  }
}

export default VideoSynchronizer;
