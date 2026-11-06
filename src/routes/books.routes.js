import { Router } from 'express';
import { listBooks, getBook } from "#controllers/books.controller";

const router = Router();

router.get("/", listBooks);
router.get('/:id', getBook);

export default router;