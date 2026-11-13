import { findAll } from "#repositories/loans.repository";
import { safeNumber } from "#utils/safeNumber";

const QUERY_LIMIT_RANGE = [1, 100]
const QUERY_OFFSET_RANGE = [0, Number.MAX_SAFE_INTEGER]

export async function findAllLoans({
    member_id, book_id,
    created_from, created_to,
    expires_from, expires_to,
    returned_from, returned_to,
    limit, offset, active_only
}) {
    return await findAll({
        member_id, book_id, created_from, created_to, expires_from, expires_to, returned_from, returned_to, active_only,
        limit: safeNumber(limit ?? 20, QUERY_LIMIT_RANGE),
        offset: safeNumber(offset ?? 0, QUERY_OFFSET_RANGE)
    });
}