// config/redis.js
const Redis = require("ioredis");

const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || "",
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on("error", (err) => console.error("Redis Client Error:", err));
redis.on("connect", () => console.log("Connected to Redis"));
redis.on("ready", () => console.log("Redis client ready"));
redis.on("reconnecting", () => console.log("Redis client reconnecting..."));

const DEFAULT_TTL = parseInt(process.env.REDIS_TTL || 600);

// Helper functions for cache
const cacheUtils = {
    async getCache(key) {
        return await redis.get(key);
    },

    async setCache(key, value, ttl = DEFAULT_TTL) {
        return await redis.set(key, value, "EX", ttl);
    },

    async deleteCache(key) {
        return await redis.del(key);
    },
};

module.exports = {
    redis,
    cacheUtils,
};
