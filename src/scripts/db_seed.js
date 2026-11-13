import "colors";
import { getPool, withTransaction } from "#database";
import { readFile } from "node:fs/promises";
import { logger } from "#utils/logger";

const seeds = [
    {
        name: 'books',
        path: './src/database/schema/seeds/books.sql'
    },
    {
        name: "members",
        path: "./src/database/schema/seeds/members.sql"
    },
    {
        name: "loans",
        path: "./src/database/schema/seeds/loans.sql"
    }
]

async function seedDatabase()  {
    const [ seedName ] = process.argv.slice(2);
    const seed = seeds.find(({ name }) => name === seedName);

    if (seedName) {
        if (!seed) return console.error("Invalid seed table typed".red);
        return await register(seed);
    } 

    const result = await withTransaction(async (client) => {
        const existsSQL = `
                SELECT ${seeds
                        .map(({ name }) => `EXISTS (SELECT 1 FROM ${name})`)
                        .join(" OR ")} AS has_data;
        `;

        const { rows } = await client.query(existsSQL);

        if (rows[0].has_data) {
            console.warn("WARNING: All tables must be empty. Seed skipped.".yellow);
            
            logger.warn(
                { action: "SEED_SKIPPED" },
                "Database seeding skipped because tables already contain data"
            );

            return { 
                success: false,
                message: "The command could not be completed; check the tables before using the command.".red
             };
        }

        const seedsSQL = await Promise.all(
            seeds.map(({ path }) => readFile(path, 'utf8'))
        );

        await client.query(seedsSQL.join("\n"));

        return { 
            success: true,
            message: `All seeds (${seeds.length}) were successfully registered`.green
         }
    });

    logger.info({ action: "DATABASE_SEED"}, "All seeds have been added");

    console.log(result.message);
}

async function register(seed) {
    const pool = await getPool({ silence: true });

    if (!seed.name || !seed.path) {
        throw new Error("Invalid seed registered, name and path are mandatory.")
    }

    try {
        const { rows } = await pool.query(`SELECT EXISTS (SELECT 1 FROM ${seed.name})`);

        if (rows[0].exists) {
            console.warn(`WARNING: ${seed.name} table is not empty. Seed skipped.`.yellow);
            return;
        }

        const sql = await readFile(seed.path, "utf-8");
        await pool.query(sql);

        console.log(`${seed.name} created successfully`.green)
        logger.info({ action: "DATABASE_SEED", seed: seed.name }, "Seed added successfully");
    }
    catch(err) {
        console.error('ERROR: Database seed failed.'.red, err);
        process.exitCode = 1
    }  
    finally {
        await pool.end()
    }
}

seedDatabase();