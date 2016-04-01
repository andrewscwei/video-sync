
'use strict';

import { w3cwebsocket as WebSocket } from 'websocket';
import _ from 'lodash';

const DEFAULT_CONNECTION_ID = 'slave-?';
const TARGET_ID = 'screensaver';
const MAX_DELIVERY_ATTEMPTS = 10;
const MAX_YIK_ATTEMPTS = 10;

class VideoSynchronizer {
  /**
   * Target video element.
   * @type {HTMLVideoElement}
   */
  get target() {
    if (!this.__target) this.__target = document.getElementById(TARGET_ID);
    if (!(this.__target instanceof HTMLVideoElement)) throw new Error('Target is not a video element');
    return this.__target;
  }

  /**
   * WebSocket connection.
   * @type {WebSocket}
   */
  get connection() {
    this.connect();
    return this.__connection;
  }

  /**
   * WebSocket connection unique ID.
   * @type {string}
   */
  get connectionId() { return this.__connectionId || DEFAULT_CONNECTION_ID; }
  set connectionId(val) { this.__connectionId = val; }

  /**
   * Specifies whether the target video is paused.
   * @type {boolean}
   */
  get paused() { return this.target ? this.target.paused : true; }

  /**
   * Specifies the length (in seconds) of the target video.
   * @type {number}
   */
  get duration() { return this.target ? this.target.duration : 0; }

  /**
   * Specifies whether the target video is in the foreground.
   * @type {boolean}
   */
  get active() { return this.__active || false; }
  set active(val) { this.__active = val; }

  /**
   * Creates a new VideoSynchronizer instance.
   */
  constructor() {
    this.__attemptedDeliveries = 0;
    this.__attemptedYiks = 0;

    this.connect();

    document.getElementById('toggle').addEventListener('click', (event) => {
      if (this.paused || !this.active)
        this.yik();
      else
        this.pause();
    });

    document.getElementById('stop').addEventListener('click', (event) => {
      this.sendMessage({ key: 'stop' });
    });

    document.getElementById('seek').addEventListener('click', (event) => {
      this.sendMessage({ key: 'seek', value: _.random(0, 1, true) });
    });
  }

  /**
   * Attempts to connect to master.
   */
  connect() {
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
      this.__connectionOpenHandler = () => this.log(`Connected to master`);
      this.__connectionErrorHandler = (error) => this.log(`Connection error`);
      this.__connectionMessageHandler = (message) => this.handleMessage(JSON.parse(message.data));
      this.__connection.addEventListener('open', this.__connectionOpenHandler);
      this.__connection.addEventListener('error', this.__connectionErrorHandler);
      this.__connection.addEventListener('message', this.__connectionMessageHandler);
    }
  }

  /**
   * Sends a message to the master. If this operation fails it will reattempt
   * indefinitely in 100ms intervals.
   * @param  {Object} message - Message body object literal.
   */
  sendMessage(message) {
    let readyState = this.connection && this.connection.readyState || -1;

    switch (readyState) {
      case 1: // Open
        this.connection.send(JSON.stringify(message));
        this.__attemptedDeliveries = 0;
        break;
      case 0: // Connecting
      case 2: // Closing
      case 3: // Closed
      default: // Unknown
        if ((MAX_DELIVERY_ATTEMPTS >= 0) && (this.__attemptedDeliveries < MAX_DELIVERY_ATTEMPTS)) {
          global.setTimeout(() => this.sendMessage(message), 100);
          this.__attemptedDeliveries++;
        }
        else {
          this.__attemptedDeliveries = 0;
        }
    }
  }

  /**
   * Requests the master to sync the target video with the rests of the slaves.
   */
  play() {
    this.log('Playing');
    this.active = true;
    this.target.play();
  }

  /**
   * Pauses the target video.
   */
  pause() {
    this.log('Paused');
    this.active = false;
    this.target.pause();
  }

  /**
   * Stops the target video.
   */
  stop() {
    this.log('Stopped');
    this.pause();
    this.target.currentTime = 0;
  }

  /**
   * Jumps to a time frame of the target video, as specified by the argument as
   * a factor (0-1) of the target video length.
   * @param  {number} val
   */
  seek(val) {
    val = _.clamp(val, 0, 1);
    const time = val * this.duration;

    if (isNaN(time)) {
      if (MAX_YIK_ATTEMPTS >= 0 && this.__attemptedYiks < MAX_YIK_ATTEMPTS) {
        global.setTimeout(() => this.yik(), 100);
        this.__attemptedYiks++;
      }
      else {
        this.__attemptedYiks = 0;
      }
    }
    else {
      const mm = Math.floor(parseInt(time/60)%60);
      const ss = Math.floor(time%60);
      this.log(`Jumping to ${(mm < 10) ? '0'+mm : mm}:${(ss < 10) ? '0'+ss : ss})`);
      this.target.currentTime = time;
      this.play();
      this.__attemptedYiks = 0;
    }
  }

  /**
   * Notifies master that a sync-up is needed.
   */
  yik() {
    this.sendMessage({ key: 'yik' });
  }

  /**
   * Responds to master's yik with the value representing the target video's
   * current play time out of the total length.
   */
  yak() {
    let val = this.target.currentTime / this.duration;
    if (isNaN(val)) val = 0;
    this.log('Echoing', val);
    this.sendMessage({ key: 'yak', value: this.active ? val : null });
  }

  /**
   * Handles messages received from master.
   * @param {Object} message
   */
  handleMessage(message) {
    switch (message.key) {
      case 'id':
        this.connectionId = message.value;
        break;
      case 'yik':
        this.yak();
        break;
      case 'stop':
        this.stop();
        break;
      case 'seek':
        this.seek(message.value);
        break;
    }
  }

  /**
   * Custom logger.
   * @param {*} ...args
   */
  log() {
    // if (!global.__debug) return;
    let args = Array.prototype.slice.call(arguments);
    args.unshift(`[${this.connectionId}]`);
    Function.apply.call(console.log, console, args);
  }
}

export default VideoSynchronizer;
