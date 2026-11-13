import { getPool } from "#database";

export async function findById(id, {client, forUpdate = false} = {}) {
    const db = client  ?? await getPool();

    const sql = `SELECT * FROM members
                 WHERE id = $1
                 ${forUpdate ? " FOR UPDATE" : ""}`;

    const { rows } = await db.query(sql, [id]);

    return rows[0];
}

export async function findAll({ name, email, max_loans, limit, offset, created_to, created_from }) {
    const pool = await getPool();

    const nullableValues = [max_loans, created_from, created_to]
    .map(value => value === '' ? null : value);

    const { rows } = await pool.query(
        `SELECT * FROM members
        WHERE name ILIKE $1
        AND email ILIKE $2
        AND ($3::smallint IS NULL OR max_loans = $3)
        AND ($4::date IS NULL OR created_at >= $4)
        AND ($5::date IS NULL OR created_at <= $5)
        ORDER BY id
        LIMIT $6 OFFSET $7`,
        [`%${name}%`, `%${email}%`, ...nullableValues, limit, offset]
    );

    return rows;
}

export async function insertMember({ name, email, max_loans }) {
  const pool  = await getPool();
  const { rows  } = await pool.query(
    "INSERT INTO members (name, email, max_loans, created_at) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *;", 
    [name, email, max_loans]
  );

  return rows[0];
}

export async function bulkInsertMembers(members) {
  const pool = await getPool();
  const placeholders = [];
  const values = [];

  for (const member of members) {
      const index = values.length;

      placeholders.push(
          `($${index + 1}, $${index + 2}, $${index + 3}, CURRENT_DATE)`
      );

      values.push(
          member.name,
          member.email,
          member.max_loans,
      );
  }

  const sql = `
      INSERT INTO members (name, email, max_loans, created_at)
      VALUES ${placeholders.join(', ')}
      RETURNING *;
  `;

  const { rows } = await pool.query(sql, values);

  return rows;
}

export async function updateMember(id, { name, email, max_loans }, client) {
    const db = client ?? await getPool();

    const { rows } = await db.query(
        `UPDATE members
        SET
            name = COALESCE($2, name),
            email = COALESCE($3, email),
            max_loans = COALESCE($4, max_loans)
        WHERE id = $1
        RETURNING *;`, 
        [id, name, email, max_loans]
    );

    return rows[0];
}

export async function existsMember(id) {
    const pool = await getPool();

    const { rows } = await pool.query(
        "SELECT EXISTS (SELECT * FROM members WHERE id = $1)",
        [id]
    );

    return rows[0];
}