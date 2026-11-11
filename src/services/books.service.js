import { findAll, findById, updateBook } from "#repositories/books.repository";
import { withTransaction } from "#database";

const QUERY_LIMIT_RANGE = [1, 100]
const QUERY_OFFSET_RANGE = [0, Number.MAX_SAFE_INTEGER]

export async function findAllBooks({ title, publisher, author, available, limit, offset, is_active }) {
    return await findAll({
        title, publisher, author, available, is_active,
        limit: safeNumber(limit, QUERY_LIMIT_RANGE),
        offset: safeNumber(offset, QUERY_OFFSET_RANGE)
    });
}

export async function validateBookStock(book, changes) {
    const { available_count, total_count } = changes;

    const hasTotalCount = total_count !== undefined;
    const hasAvailableCount = available_count !== undefined;

    if (!hasTotalCount && !hasAvailableCount) return changes;
    
    const borrowedCount = book.total_count - book.available_count;

    const newTotalCount = total_count ?? book.total_count;
    const newAvailableCount = available_count ??
        book.available_count + (newTotalCount - book.total_count);

    const invalidTotalCount = newTotalCount < 1;
    const invalidAvailableCount = newAvailableCount < 0;
    const exceedsTotalCount = newAvailableCount > newTotalCount;
    const belowBorrowedCount = newTotalCount < borrowedCount;
    const inconsistentBorrowedCount = newTotalCount - newAvailableCount !== borrowedCount;

    if (invalidTotalCount) return false;
    if (invalidAvailableCount) return false;
    if (exceedsTotalCount) return false;
    if (belowBorrowedCount) return false;
    if (inconsistentBorrowedCount) return false;

    return {
        ...changes,
        ...(hasTotalCount && { available_count: newAvailableCount })
    };
}

export async function modifyBookStock(id, changes) {
    return await withTransaction(async (client) => {
            const book = await findById(id, {client, forUpdate: true});
    
            const validatedChanges = await validateBookStock(book, changes);
    
            if (!validatedChanges) return { 
                    success: false,
                    error: "Invalid book stock.",
                    status: 400
                };
    
            const updatedBook = await updateBook(id, validatedChanges, client);
            return {
                success: true,
                data: updatedBook,
                status: 200
            };
    });
}

function safeNumber(num, range) {
    return Math.floor(Math.min(Math.max(num, range[0]), range[1]));
}