import { getPool } from "#database";

export async function findAll({ title, author, publisher, available, limit, offset, is_active }) {
  const pool = await getPool();

  const { rows } = await pool.query(
    `SELECT * FROM books
     WHERE title ILIKE $1
       AND author ILIKE $2
       AND publisher ILIKE $3
       AND ($4 = false OR available_count > 0)
       AND is_active = $5
     ORDER BY id
     LIMIT $6 OFFSET $7`,
    [`%${title}%`, `%${author}%`, `%${publisher}%`, available, is_active, limit, offset]
  );

  return rows;
}

export async function findById(id, {client, forUpdate = false} = {}) {
    const db = client ?? await getPool();

    const sql = `SELECT * FROM books 
                 WHERE id = $1 AND is_active
                 ${forUpdate ? " FOR UPDATE" : ""}`;

    const { rows } = await db.query(sql, [id]);

    return rows[0];
}

export async function insertBook({ title, author, publisher = 'Unknown', total_count }) {
  const pool  = await getPool();
  const { rows  } = await pool.query(
    "INSERT INTO books (title, author, publisher, total_count, available_count) VALUES ($1, $2, $3, $4, $4) RETURNING *;", 
    [title, author, publisher, total_count]
  );

  return rows[0]
}

export async function bulkInsertBooks(books) {
  const pool = await getPool();
  const placeholders = [];
  const values = [];

  for (const book of books) {
      const index = values.length;

      placeholders.push(
          `($${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 4})`
      );

      values.push(
          book.title,
          book.author,
          book.publisher ?? 'Unknown',
          book.total_count
      );
  }

  const sql = `
      INSERT INTO books (title, author, publisher, total_count, available_count)
      VALUES ${placeholders.join(', ')}
      RETURNING *;
  `;

  const { rows } = await pool.query(sql, values);

  return rows;
}

export async function updateBook(id, changes, client) {
    const db = client ?? await getPool();

    const setClauses = [];
    const values = [id];

    for (const [key, value] of Object.entries(changes)) {
        const index = values.length;

        setClauses.push(`${key} = $${index + 1}`);
        values.push(value);
    }

    const sql = `UPDATE books
                 SET ${setClauses.join(", ")}
                 WHERE id = $1
                 RETURNING *`;

    const { rows } = await db.query(sql, values);

    return rows[0];
}

export async function removeBook(id) {
  const pool = await getPool();

  const { rows} = await pool.query(
    `UPDATE books 
    SET is_active = FALSE 
    WHERE id = $1
    RETURNING *`,
    [id]
  );

  return rows[0]
}

export async function activeBook(id) {
  const pool = await getPool();

  const { rows, rowCount } = await pool.query(
    `UPDATE books
    SET is_active = TRUE 
    WHERE id = $1 AND is_active = FALSE
    RETURNING *`,
    [id]
  );

  return {  book: rows[0], rowCount };
}

export async function existsBook(id) {
  const pool = await getPool();

  const { rows } = await pool.query(
    "SELECT EXISTS ( SELECT * FROM books WHERE id = $1 AND is_active )",
    [id]
  )

  return rows[0];
}