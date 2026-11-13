import { findById } from "#repositories/loans.repository";
import { dateRangesSchema } from "#schemas/date.schema";
import { createLoan, findAllLoans, returnLoanById } from "#services/loans.service";
import { getQueryValue } from "#utils/normalizeQueryValue";
import { logger } from "#utils/logger";

export async function getLoan(req, res) {
    const loan = await findById(req.params.id);
    res.status(200).json(loan);
}

export async function listLoans(req, res) {
    const query = req.query;
    
     
    const validQuerys = ['member_id', 'book_id'];
    const querys =  validQuerys.map((key) => getQueryValue(query, key));
    const filter = Object.fromEntries(querys);
    
    const dateRanges = [
        {
            from: filter.craeted_from,
            to: filter.created_to
        },
        {
            from: filter.expires_from,
            to: filter.expires_to
        },
        {
            from: filter.returned_from,
            to: filter.returned_to
        }
    ];

    const result = dateRangesSchema.safeParse(dateRanges); 
    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid date range provided.',
            details: result.error.issues
        });
    }

    filter.limit = Number(query.limit) || 20;
    filter.offset = Number(query.offset) || 0;
    filter.active_only = getQueryValue(query, 'active_only')[1].toLowerCase() === "true";

    const loans = await findAllLoans(filter)
    res.status(200).json(loans);
}

export async function addLoan(req, res) {
    const result = await createLoan(req.body);

    if (!result.success) {
        return res.status(result.status).json({ error: result.error });
    }

    logger.info(
        { 
            action: "LOAN_CREATE", 
            loanId: result.data.id, 
            memberId: result.data.member_id, 
            bookId: result.data.book_id 
        },
        "Loan created successfully"
    );

    res.status(result.status).json(result.data);
}

export async function returnLoan(req, res) {
    const result = await returnLoanById(req.params.id);

    if (!result.success) {
        return res.status(result.status).json({ error: result.error });
    }

    logger.info(
        { 
            action: "LOAN_UPDATE", 
            loanId: result.data.id, 
            memberId: result.data.member_id, 
            bookId: result.data.book_id ,
            returnedAt: result.data.returned_at
        },
        "Loan returned"
    );

    res.status(result.status).json(result.data);
}