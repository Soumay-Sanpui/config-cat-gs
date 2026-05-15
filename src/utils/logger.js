import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || "info";

const logger = pino({
    level: logLevel,
    base: {
        service: "production-backend",
        env: process.env.NODE_ENV || "production",
    },

    timestamp: pino.stdTimeFunctions.isoTime,

    transport: isProduction ? undefined :
        {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
            },
        },
    redact: {
        paths: ["req.headers.authorization", "token", "password"],
        censor: "[REDACTED]"
    }
});

export default logger;
