import rateLimit from "express-rate-limit";
import {getFlag} from "../utils/flagService.js";
import logger from "../utils/logger.js";
import {getUsage, increment} from "../utils/rateLimitTracker.js";

const freeTierLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 100,
    keyGenerator : (req) => req.user?.id || req.ip,
    // function to execute when user has exceeded the rate limit
    handler: (req, res) => {
        const usage = getUsage(req.user?.id) || req.ip;
        logger.warn({
            type: "RATE_LIMIT_HIT",
            userId: req.user?.id,
            email: req.user?.email,
            plan: req.user?.plan,
            limit: usage.limit,
            used: usage.used,
            resetAt: usage.resetAt,
        })
        res.status(429).json({
            error: "Rate Limit Exceeded",
            message: "Free tier is limit to 100 API calls/day. Upgrade for unlimited access.",
            limit: 100,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
    },
    skip: () => false,
});

async function rateLimitGateMiddleware(req, res, next)
{
    try {
        const shouldLimit = await getFlag("rate_limit_free_tier", req.user);
        if(shouldLimit) {
            increment(req.user?.id || req.ip);
            logger.info({
                type: "RATE_LIMIT_CHECK",
                userId: req.user?.id,
                email: req.user?.email,
                plan: req.user?.plan,
                ...getUsage(req.user?.id || req.ip),
            })
            return freeTierLimiter(req, res, next);
        }
        next();
    } catch(err) {
        logger.error(`Error occurred while checking rate limit: ${err}`);
        next();
   }
}

export default rateLimitGateMiddleware;
