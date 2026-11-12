import { Router } from "express";
import { listBooks, getBook, addBook, addBooks, modifyBook, deleteBook, reactivateBook } from "#controllers/books.controller";
import { validateBook, validateBooks, validateBookPatch, validateBookId } from "#middlewares/books.middleware";
import { verifyToken } from "#middlewares/auth.middleware";

const router = Router();

router.get("/", listBooks);
router.get("/:id", validateBookId, getBook);

router.post("/", verifyToken, validateBook, addBook);
router.post("/bulk", verifyToken, validateBooks, addBooks);

router.patch("/:id", verifyToken, validateBookId, validateBookPatch, modifyBook);
router.patch("/:id/reactivate", verifyToken, reactivateBook)

router.delete("/:id", verifyToken, validateBookId, deleteBook);

export default router;