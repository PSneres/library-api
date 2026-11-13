import { withTransaction } from "#database";
import { findAll, findById, updateMember } from "#repositories/members.repository";
import { safeNumber } from "#utils/safeNumber";
import { countActiveLoans } from "#repositories/loans.repository";

const QUERY_LIMIT_RANGE = [1, 100];
const QUERY_OFFSET_RANGE = [0, Number.MAX_SAFE_INTEGER];
const QUERY_MAX_LOANS_RANGE = [0, 10];

export async function findAllMembers({ name, email, max_loans, limit, offset, created_to, created_from }) {
    return await findAll({
        name, email, created_from, created_to,
        max_loans: safeNumber(max_loans, QUERY_MAX_LOANS_RANGE),
        limit: safeNumber(limit ?? 20, QUERY_LIMIT_RANGE),
        offset: safeNumber(offset ?? 0, QUERY_OFFSET_RANGE)
    });
}

export async function safeUpdateMember(id, changes) {
    return await withTransaction(async (client)  => {
        if (changes.max_loans !== undefined) {

            await findById(id, { client, forUpdate: true });
            const loansCount = await countActiveLoans(id, client);

            const result = verifyMaxLoans(loansCount, changes);
            if (!result) {
                return {
                    success: false,
                    error: `max_loans cannot be lower than the number of active loans. (${loansCount})`,
                    status: 400,
                }
            }
        }

        const updatedMember = await updateMember(id, changes, client);

        return {
            success: true,
            data: updatedMember,
            status: 200
        }
    });
}

function verifyMaxLoans(totalLoans, changes) {
    return changes.max_loans >= totalLoans;
}