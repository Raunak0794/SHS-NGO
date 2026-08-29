const Redis = require("ioredis");

let redis = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 2 ? null : 1500),
    });

    redis.connect().catch((err) => {
      console.warn("Redis unavailable, running with in-memory fallback:", err.message);
    });

    redis.on("connect", () => {
      console.log("Connected to Redis");
    });

    redis.on("error", (err) => {
      // Quietly log without crashing
      // console.warn("Redis error:", err.message);
    });
  } catch (err) {
    console.warn("Redis init failed:", err.message);
    redis = null;
  }
}

module.exports = redis;
