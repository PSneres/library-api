import "colors";
import { getPool } from "#database";
import { readFile } from "node:fs/promises";

async function seedDatbase()  {
    const pool = await getPool({ silence: true })

    try {
        const { rows } = await pool.query("SELECT EXISTS (SELECT 1 FROM books) AS has_books");

        if (rows[0].has_books) {
            console.warn("WARNING: Books table is not empty. Seed skipped.".yellow);
            return;
        }

        const sql = await readFile("./src/database/schema/seeds/books.sql", "utf-8");
        await pool.query(sql);

        console.log("Books created successfully".green)
    }
    catch(err) {
        console.error('ERROR: Database seed failed.'.red, err);
        process.exitCode = 1
    }  
    finally {
        await pool.end()
    }
}

seedDatbase()