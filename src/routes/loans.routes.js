import { Router } from "express";
import { listLoans } from "#controllers/loans.controller";
import { verifyToken } from "#middlewares/auth.middleware";

const router = Router();

router.get('/', listLoans);

export default router;