import { getFlag } from "../utils/flagService.js";
import {increment, getUsage} from "../utils/rateLimitTracker.js"
import logger from "../utils/logger.js";

const DAILY_LIMIT = 100;

async function rateLimitGateMiddleware(req, res, next) {
    try {
        const shouldLimit = await getFlag("rate_limit_free_tier", req.user);

        if (!shouldLimit) return next();

        // Increment first — get back the new count
        const count = await increment(req.user?.id || req.ip);

        logger.info({
            type:      "RATE_LIMIT_CHECK",
            userId:    req.user?.id,
            email:     req.user?.email,
            plan:      req.user?.plan,
            used:      count,
            remaining: Math.max(0, DAILY_LIMIT - count),
            limit:     DAILY_LIMIT,
        });

        // Block if over limit
        if (count > DAILY_LIMIT) {
            const usage = await getUsage(req.user?.id || req.ip);

            logger.warn({
                type:    "RATE_LIMIT_HIT",
                userId:  req.user?.id,
                email:   req.user?.email,
                resetAt: usage.resetAt,
            });

            return res.status(429).json({
                error:   "Rate Limit Exceeded",
                message: "Free tier is limited to 100 API calls/day.",
                usage,
            });
        }

        next();
    } catch (err) {
        logger.error(`Rate limit gate error: ${err}`);
        next(); // fail open
    }
}

export default rateLimitGateMiddleware;