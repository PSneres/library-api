import { Pool } from "pg";
import { getDatabaseUrl } from "#config/environment";
import { registerPoolEvents } from "./events.js";
import { checkSchema } from "../schema/schemaCheck.js";
import { logger } from "#utils/logger";

let pool = null;

export async function getPool({ silence=false, skipSchemaCheck = false } = {}) {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      connectionTimeoutMillis: 5000,
    });

    if (!skipSchemaCheck) await checkSchema(pool);
    registerPoolEvents(pool);

    if (!silence) logger.info({ action: "DATABASE_CONNECTED"}, "Pool created successfully.");
  }
  return pool;
}