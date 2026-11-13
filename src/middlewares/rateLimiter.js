import { rateLimit } from "express-rate-limit";
import { logger } from "#utils/logger";

export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,

    handler: (req, res) => {
        logger.warn(
            { action: "RATE_LIMIT_EXCEEDED", ip: req.ip },
            "Rate limit exceeded"
        );

        res.status(429).json({
            error: "Too many requests. Please try again later."
        });
    }
});