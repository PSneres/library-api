import { findAll } from "#repositories/books.repository";

const QUERY_ALL_LIMIT = [1, 100]

export async function findAllBooks({ limit, offset }) {
    const safeLimit = Math.min(Math.max(limit, QUERY_ALL_LIMIT[0]), QUERY_ALL_LIMIT[1]);
    const safeOffset = Math.max(offset, 0);

    return findAll({
        limit: safeLimit,
        offset: safeOffset
    });
}