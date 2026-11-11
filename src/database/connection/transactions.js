import { getPool } from "#database";

export async function withTransaction(callback) {
    const pool = await getPool();
    const client = await pool.connect();

    try {
         await client.query("BEGIN");

         const result = await callback(client);
         if (!result.success) {
            await client.query("ROLLBACK");
            return result;
         }

         await client.query("COMMIT");
         return result;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}