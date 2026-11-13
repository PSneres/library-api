import { logger } from "#utils/logger";
import 'colors';

export async function tablesExist(pool) {
    const { rows } = await pool.query(`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('members', 'books', 'loans')
            GROUP BY table_schema
            HAVING COUNT(*) = 3
        ) AS exists;
    `);

    return rows[0].exists;
}

export async function checkSchema(pool) {
    const hasTables = await tablesExist(pool);
    if (hasTables) {
        logger.info("SCHEMA_CHECK")
        return; 
    }

    console.error('ERROR: Required database tables do not exist.'.red);
    console.error('Run "npm run db:setup --force=true" to create the database schema.');
    console.error('WARNING: This command will delete and recreate all database tables, permanently removing existing data.'.yellow);
        
    await pool.end();
    process.exit(1)
}