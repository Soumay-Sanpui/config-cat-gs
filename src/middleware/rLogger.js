import {pinoHttp} from "pino-http";
import {randomUUID} from "crypto";
import logger from "../utils/logger.js"

const httpLogger = pinoHttp({
    logger,

    genReqId: (req) => {
        return req.headers["x-request-id"]|| randomUUID();
    },

    customProps: (req) => ({
        requestId: req.id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    }),

    autoLogging: {
        // ignore spamming the logs with unessecary health and metrics endpoints
        // will only remove the auto logging (like the requestion completion) and not the custom log statements in the handlers
        ignore: (req) => req.url === "/health" || req.url === "/metrics" || req.url === "/favicon.ico",
    },

    customLogLevel: function (req, res, err) {
        if(err || res.statusCode >= 500) return "error";
        if(res.responseTime > 1000) return "warn";
        return "info";
    },

    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method.toUpperCase(),
                url: req.url,
                query: req.query,
                params: req.params,
            };
        },

        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
});
export default httpLogger;