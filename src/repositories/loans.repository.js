import { getPool } from "#database";

export async function findAll({
    member_id, book_id,
    created_from, created_to,
    expires_from, expires_to,
    returned_from, returned_to,
    limit, offset, active_only
},
{ client, forUpdate = false } = {}
) {
    const db = client ?? await getPool();

    const nullableValues = [
        member_id, book_id,
        created_from, created_to,
        expires_from, expires_to,
        returned_from, returned_to
    ].map(value => value || null);

    const { rows } = await db.query(
        `SELECT * FROM loans
         WHERE ($1::integer IS NULL OR member_id = $1)
           AND ($2::integer IS NULL OR book_id = $2)
           AND ($3::date IS NULL OR created_at >= $3)
           AND ($4::date IS NULL OR created_at < ($4::date + INTERVAL '1 day'))
           AND ($5::date IS NULL OR expires_at >= $5)
           AND ($6::date IS NULL OR expires_at < ($6::date + INTERVAL '1 day'))
           AND ($7::date IS NULL OR returned_at >= $7)
           AND ($8::date IS NULL OR returned_at < ($8::date + INTERVAL '1 day'))
           AND ($11::boolean = FALSE OR returned_at IS NULL)
        ${forUpdate ? " FOR UPDATE" : ""}
         ORDER BY id
         LIMIT $9 OFFSET $10`,
        [...nullableValues, limit, offset, active_only]
    );

    return rows;
}

export async function countActiveLoans(memberId, client) {
    const db = client ?? await getPool();

    const { rows } = await db.query(
        `SELECT COUNT(*) FROM loans
         WHERE member_id = $1
         AND returned_at IS NULL`,
        [memberId]
    );

    return Number(rows[0].count);
}