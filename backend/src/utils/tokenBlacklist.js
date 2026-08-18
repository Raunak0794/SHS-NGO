const { createHash } = require("crypto");
const redis = require("../db/redis");

const NEGATIVE_CACHE_MS = Number(process.env.TOKEN_CACHE_MS || 30000);
const MAX_CACHE_ENTRIES = 5000;
const cache = new Map();

function getCacheKey(token) {
  return createHash("sha256").update(token).digest("hex");
}

function setCachedStatus(key, blacklisted, ttlMs) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { blacklisted, expiresAt: Date.now() + ttlMs });
}

async function isTokenBlacklisted(token) {
  if (!redis || !token) return false;

  const key = getCacheKey(token);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.blacklisted;
  }
  cache.delete(key);

  const blacklisted = Boolean(await redis.get(`blacklist:${token}`));
  setCachedStatus(key, blacklisted, blacklisted ? 24 * 60 * 60 * 1000 : NEGATIVE_CACHE_MS);
  return blacklisted;
}

async function blacklistToken(token, ttlSeconds = 24 * 60 * 60) {
  if (!token) return;

  setCachedStatus(getCacheKey(token), true, ttlSeconds * 1000);
  if (redis) {
    await redis.set(`blacklist:${token}`, "true", "EX", ttlSeconds);
  }
}

module.exports = { blacklistToken, isTokenBlacklisted };
