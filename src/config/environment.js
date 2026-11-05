import "dotenv/config";

export function getDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("'DATABASE_URL' environment variable is not defined.");
    }

    return databaseUrl;
}