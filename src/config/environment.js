import "dotenv/config";

export function getDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("'DATABASE_URL' environment variable is not defined.");
    }

    return databaseUrl;
}

export function getJWTSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("'JWT_SECRET' environment variable is not defined.");
    }

    return secret;
}