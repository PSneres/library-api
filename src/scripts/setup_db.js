import 'colors';
import readline from 'readline/promises';
import { readFile } from "node:fs/promises";
import { getPool } from '#database';

if (process.env.npm_config_force !== 'true') {
  console.error('Error: Use the tag --force=true'.red);
  process.exit(1);
}   

confirmDatabaseSetup()

async function confirmDatabaseSetup() {
  const pool = await getPool({
    silence: true, 
    skipSchemaCheck: true
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const { rows } = await pool.query("SELECT current_database() AS database;");

    const { hostname, username } = new URL(process.env.DATABASE_URL);
    const database = rows[0].database;

    console.log('\nWARNING: This operation will delete and recreate all database tables.'.yellow.bold)
    console.log(`\n Host: ${hostname}\n Database: ${database}\n User: ${username}\n\n Type the database username to confirm:`)
    const res = await rl.question('> ');

    if (res.trim() !== username) {
      console.log('ERROR: Invalid confirmation.'.red);
      console.log('Operation cancelled.');
      process.exitCode = 1
      return;
    } 

    await setupDatabase(pool);

    } catch(error) {
      console.error('ERROR: Database setup failed.'.red);
      console.error(error);
      process.exitCode = 1;
    } finally {
      rl.close();
      await pool.end();
    }
}

async function setupDatabase(pool) {
    const sql = await readFile("./src/database/schema/schema.sql", "utf-8");
    await pool.query(sql);
    
    console.log("Database successfully recreated.".green);
}