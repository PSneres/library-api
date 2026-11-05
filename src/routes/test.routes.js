import { Router } from 'express';
import { tester } from "#controllers/test.controller";

const router = Router();

router.get("/", tester)

export default router;