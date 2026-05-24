import logger from "./logger.js";
import Redis from "ioredis";

const DAILY_LIMIT = 100;
const WINDOW_SECS = 24 * 60 * 60;

const redis = new Redis({
    host: process.env.REDIS_HOST || "redis",
    port: process.env.REDIS_PORT || 6379,

    lazyConnect: true,
    retryStrategy(times) {
        if(times > 3) {
            logger.error("Redis unavailable after 3 retires - rate limiting disabled.");
            return null;
        }
        return Math.min(times * 200 * 1000);
    },
});

redis.on("connect", ()=> logger.info("Redis Connected"));
redis.on("error", (error)=> logger.error(`Redis Error: ${error.message}`));


function buildKey(userId) {
    return `rate_limit:${userId}`;
}

async function increment(userId) {
    try {
        const key = buildKey(userId);
        const count = await redis.incr(key);

        // set expiry for the first time otherwise it will never expire & will push the window forward.
        if(count === 1) await redis.expire(key, WINDOW_SECS);
        return count;
    } catch (error) {
        logger.error(`Redis increment failed : ${userId} : ${error.message}`);
        return 0;
    }
}

async function getUsage(userId) {
    try {
        const key = buildKey(userId);
        const [count, ttl] = await Promise.all([
            redis.get(key),
            redis.ttl(key)
        ]);

        const used = parseInt(count || "0", 10);
        const remaining = Math.max(0, DAILY_LIMIT - used);
        const resetAt = ttl > 0 ?
            new Date(Date.now() + ttl * 1000).toISOString() :
            new Date(Date.now() + WINDOW_SECS * 1000).toISOString();

        return {
            userId,
            used,
            remaining,
            limit: DAILY_LIMIT,
            resetAt,
            windowAge: ttl > 0 ? `${Math.floor((WINDOW_SECS - ttl) / 3600)}h ${Math.floor(((WINDOW_SECS - ttl) % 3600) / 60)}m` : "0h 0m",
            isExhausted: used >= DAILY_LIMIT,
        };
    } catch (error) {
        logger.error(`Redis getUsage Error: ${error.message}`);
        return {
            userId,
            used: 0,
            remaining: DAILY_LIMIT,
            limit: DAILY_LIMIT,
            resetAt: null,
            isExhausted: false,
        };
    }
}

async function getAllUsage() {
    try {
        const keys = await redis.keys("rate_limit:*");
        if(keys.length === 0) return [];

        return Promise.all(
            keys.map((key) => {
                const userId = key.replace("rate_limit:", "");
                return getUsage(userId);
            })
        )
    } catch(error) {
        logger.error(`Redis getAllUsage failed: ${error.message}`);
        return [];
    }
}

export {increment, getUsage, getAllUsage};
