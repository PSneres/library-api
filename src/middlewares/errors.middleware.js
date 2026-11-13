import { logger } from "#utils/logger";

export function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    logger.error(
        { err, method: req.method, path: req.path },
        "UNHANDLED_ERROR"
    );

    res.status(500).json({
        error: "Internal server error."
    });
};