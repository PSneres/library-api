import { getPool } from "#database";

export async function findAll({ limit, offset }) {
    const pool = await getPool();
    const { rows } = await pool.query(
        "SELECT * FROM books ORDER BY id LIMIT $1 OFFSET $2", 
        [ limit,  offset ]
    );

    return rows;
}