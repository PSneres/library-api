import { existsLoan } from "#repositories/loans.repository";
import { loanSchema } from "#schemas/loans.schema";

export async function validateLoanId(req, res, next) {
    const id = Number(req.params.id);
        
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid id provided"  });
    }
    
    const hasLoan = await existsLoan(id);
    if (!hasLoan.exists) {
        return res.status(404).json({ error: "Loan not found" });
    }
    
    next();
}

export async function validateLoan(req, res, next) {
    const result = loanSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid loan data',
            details: result.error.issues
        });
    }

    req.body = result.data;
    next();
}