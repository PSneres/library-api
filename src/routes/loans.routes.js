import { Router } from "express";
import { addLoan, getLoan, listLoans, returnLoan } from "#controllers/loans.controller";
import { verifyToken } from "#middlewares/auth.middleware";
import { validateLoan, validateLoanId } from "#middlewares/loans.middleware";

const router = Router();

router.get("/:id", verifyToken, validateLoanId, getLoan);
router.get("/", verifyToken, listLoans);

router.post("/", verifyToken, validateLoan, addLoan);

router.patch("/:id/return", verifyToken, validateLoanId, returnLoan);

export default router;