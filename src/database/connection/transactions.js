import { getPool } from "#database";
import { logger } from "#utils/logger";

export async function withTransaction(callback) {
    const pool = await getPool();
    const client = await pool.connect();

    try {
         await client.query("BEGIN");

         const result = await callback(client);
         if (!result.success) {
            await client.query("ROLLBACK");
            logger.error("TRANSACTION_FAILED");
            return result;
         }

         await client.query("COMMIT");
         return result;

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error(
            { err },
            "TRANSACTION_FAILED"
        );
        throw err;
    } finally {
        client.release();
    }
}