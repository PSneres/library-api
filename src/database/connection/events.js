import { logger } from "#utils/logger";

export function registerPoolEvents(pool) {
  pool.on("error", (err) => {
    logger.error(
        { err },
        "DATABASE_POOL_ERROR"
    );
  });
}