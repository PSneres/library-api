import { withTransaction } from "#database";
import { countActiveLoans, findAll, findById as findLoanById, insertLoan, markLoanAsReturned } from "#repositories/loans.repository";
import { findById as findMemberById } from "#repositories/members.repository";
import { findById as findBookById, updateBook } from "#repositories/books.repository";
import { safeNumber } from "#utils/safeNumber";

const QUERY_LIMIT_RANGE = [1, 100];
const QUERY_OFFSET_RANGE = [0, Number.MAX_SAFE_INTEGER];
const MAX_LOAN_DAYS = 56; // 8 Weeks;

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

export async function createLoan(loan) {
    const parseLoanResult = parseLoanExpiration(loan.expires_in);

    if (!parseLoanResult.success) return {
        success: false,
        error: parseLoanResult.error,
        status: parseLoanResult.status
    }

    return await withTransaction(async (client) => {
        const member = await findMemberById(loan.member_id, { client, forUpdate: true });

        if (!member) return {
            success: false,
            status: 404,
            error: "Member not found"
        }

        const book = await findBookById(loan.book_id, { client, forUpdate: true });
        if (!book || !book.is_active) return {
            success: false,
            status: 404,
            error: "Book not found"
        }

        const loansCount = await countActiveLoans(loan.member_id, client);

        if (loansCount >= member.max_loans) return {
            success: false,
            status: 409,
            error: "Member has reached the maximum number of active loans."
        }

        if (book.available_count < 1) return {
            success: false,
            status: 409,
            error: "No copies of this book are currently available for loan."
        }

        const resultLoan = await insertLoan({
            member_id: loan.member_id, 
            book_id: loan.book_id,
            expires_at: parseLoanResult.data
        }, client);

        await updateBook(
            book.id, 
            {  available_count: book.available_count - 1 }, 
            client
        );

        return { 
            success: true,
            status: 201,
            data: resultLoan
        }
    });
}

export async function returnLoanById(id) {
    return await withTransaction(async (client) => {
        const loan = await findLoanById(id, { client, forUpdate: true });
        await findMemberById(loan.member_id, { client, forUpdate: true });
        const book = await findBookById(loan.book_id, { client, forUpdate: true });

        if (loan.returned_at) return {
            success: false,
            status: 409,
            error: "This loan has already been returned."
        }

        const resultLoan = await markLoanAsReturned(loan.id, client);

        await updateBook(
            book.id,
            { available_count : book.available_count + 1},
            client
        );

        return {
            success: true,
            status: 200,
            data: resultLoan
        }
    })
}

function parseLoanExpiration(expirationDuration) {
    const durationValue = Number(expirationDuration.slice(0, -1));
    const durationUnit = expirationDuration.at(-1).toLowerCase();;
    const durationDays = durationValue * (durationUnit === 'w' ? 7 : 1);

    if (durationDays > MAX_LOAN_DAYS) return {
        success: false,
        status: 400,
        error: "Invalid loan duration. Must be between 1 and 56 days."
    }

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);

    return {
        success: true,
        data: expirationDate
    };
}