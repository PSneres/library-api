export function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    console.error(err);

    res.status(500).json({
        error: "Internal server error."
    });
};