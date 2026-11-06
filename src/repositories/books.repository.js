import { getPool } from "#database";

export async function findAll({ title, author, publisher, available, limit, offset }) {
  const pool = await getPool();

  const { rows } = await pool.query(
    `SELECT * FROM books
     WHERE title ILIKE $1
       AND author ILIKE $2
       AND publisher ILIKE $3
       AND ($4 = false OR available_count > 0)
     ORDER BY id
     LIMIT $5 OFFSET $6`,
    [`%${title}%`, `%${author}%`, `%${publisher}%`, available, limit, offset]
  );

  return rows;
}

export async function findById(id) {
    const pool = await getPool();
    const { rows } = await pool.query(
        "SELECT * FROM books WHERE $1 = id;",
        [id]
    );

    return rows[0];
}