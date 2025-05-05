const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 1, 
  enableOfflineQueue: false,
  connectTimeout: 1000, 
  retryStrategy(times) {
    if (times > 3) { 
      return null;
    }
    return Math.min(times * 100, 1000);    
  }
};

const redisPool = {
  _clients: {},
  
  getClient(name = 'default') {
    if (!this._clients[name]) {
      this._clients[name] = new Redis(redisConfig);
      this._clients[name].on('error', (err) => {
        console.error(`Redis client ${name} error:`, err);
      });
      this._clients[name].on('ready', () => {
        console.log(`Redis client ${name} connected and ready`);
      });
    }
    return this._clients[name];
  },
  
  closeAll() {
    Object.values(this._clients).forEach(client => {
      client.quit();
    });
    this._clients = {};
  }
};

const redisClient = redisPool.getClient('client');
const publisherClient = redisPool.getClient('publisher');
const subscriberClient = redisPool.getClient('subscriber');

const cacheUtils = {
  async getCache(key) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.warn(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  },

  async setCache(key, value, ttl) {
    try {
      if (ttl) {
        return await redisClient.set(key, value, 'EX', ttl);
      }
      return await redisClient.set(key, value);
    } catch (error) {
      console.warn(`Redis SET error for key ${key}:`, error.message);
      return false;
    }
  },
};

const pubSubUtils = {
  async publish(channel, message) {
    try {
      return await publisherClient.publish(
        channel, 
        JSON.stringify(message)
      );
    } catch (error) {
      console.warn(`Redis PUBLISH error:`, error.message);
      return 0;
    }
  },
  
  subscribe(channel, callback) {
    subscriberClient.subscribe(channel, (err) => {
      if (err) {
        console.error(`Error subscribing to channel ${channel}:`, err.message);
        return;
      }
    });
    
    subscriberClient.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          callback(message);
        }
      }
    });
  },
};

module.exports = {
  redisClient,
  publisherClient,
  subscriberClient,
  cacheUtils,
  pubSubUtils,
  redisPool
};