import { findAll } from "#repositories/books.repository";

const QUERY_LIMIT_RANGE = [1, 100]
const QUERY_OFFSET_RANGE = [0, Number.MAX_SAFE_INTEGER]

export async function findAllBooks({ title, publisher, author, available, limit, offset}) {
    return await findAll({
        title, publisher, author, available,
        limit: safeNumber(limit, QUERY_LIMIT_RANGE),
        offset: safeNumber(offset, QUERY_OFFSET_RANGE)
    });
}

function safeNumber(num, range) {
    return Math.floor(Math.min(Math.max(num, range[0]), range[1]));
}