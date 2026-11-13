import { getJWTSecret } from "#config/environment";
import jwt from "jsonwebtoken"; 
import { logger } from "#utils/logger";

export function verifyToken(req, res, next) {
    const match = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
    const token = match?.[1]
    if (!token) {
        res.status(401).json({ error: 'Missing or invalid authorization token.' });
        logger.warn({ action: "AUTH_MISSING" }, "Authentication token missing");
        return;
    }

    const secret = getJWTSecret(); //Moved outside try/catch to avoid 403 errors from missing env vars.   
    try {
        jwt.verify(token, secret);
    } catch (err) {
        logger.warn({ action: "AUTH_INVALID" }, "Invalid or expired authentication token");
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    next();
}