import {getFlag} from "../utils/flagService.js";
import logger from "../utils/logger.js";

function featureGateMiddleware(flagKey)
{
    return async (req, res, next) =>
    {
        const user = req.user;
        if(!user) return res.status(401).json({ error: "Unauthorized" });

        try {
            const isEnabled = await getFlag(flagKey, user);

            if(!isEnabled)
            {
                return res.status(403).json({
                    error: "Feature not available",
                    message: `${flagKey} is not enabled for your account`,
                    upgradeRequired: user.plan === "free",
                });
            }

            req.flags = req.flags || {};
            req.flags[flagKey] = true;

            next();
        }  catch(err) {
            logger.error(`Error checking feature flag ${flagKey} for user ${user.id}: ${err.message}`);
            next();
        }
    }
}

export default featureGateMiddleware;
