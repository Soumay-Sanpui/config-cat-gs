import rateLimit from "express-rate-limit";
import {getFlag} from "../utils/flagService.js";
import logger from "../utils/logger.js";

const freeTierLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 100,
    keyGenerator : (req) => req.user?.id || req.ip,
    handler: (req, res) => {
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
        if(shouldLimit) return freeTierLimiter(req, res, next);
        next();
    } catch(err) {
        logger.error(`Error occurred while checking rate limit: ${err}`);
        next();
   }
}

export default rateLimitGateMiddleware;
