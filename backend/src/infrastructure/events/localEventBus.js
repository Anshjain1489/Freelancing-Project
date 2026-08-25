const EventEmitter = require('events');
const logger = require('../../utils/logger');

class LocalEventBus {
  constructor() {
    this.name = 'local';
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
    this.eventsPublishedCount = 0;
  }

  publish(eventName, payload) {
    if (!eventName) return false;

    // Sanitize payload: never publish sensitive credentials
    const cleanPayload = { ...payload };
    delete cleanPayload.password;
    delete cleanPayload.otp;
    delete cleanPayload.rawOtp;
    delete cleanPayload.delivery_otp_hash;
    delete cleanPayload.delivery_otp_encrypted;
    delete cleanPayload.token;
    delete cleanPayload.jwt;
    delete cleanPayload.secret;
    delete cleanPayload.razorpaySecret;

    this.eventsPublishedCount++;
    this.emitter.emit(eventName, cleanPayload);
    return true;
  }

  subscribe(eventName, handler) {
    if (!eventName || typeof handler !== 'function') return false;
    this.emitter.on(eventName, handler);
    return true;
  }

  unsubscribe(eventName, handler) {
    if (!eventName || typeof handler !== 'function') return false;
    this.emitter.removeListener(eventName, handler);
    return true;
  }

  getStats() {
    return {
      provider: this.name,
      eventsPublishedCount: this.eventsPublishedCount,
      activeListenersCount: this.emitter.eventNames().length
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      provider: this.name,
      eventsPublishedCount: this.eventsPublishedCount
    };
  }
}

module.exports = LocalEventBus;
