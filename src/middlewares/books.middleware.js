import { bookSchema, booksSchema } from "#schemas/books.schema";
import { existsBook } from "#repositories/books.repository";

export function validateBook(req, res, next) {
    const result = bookSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid book data',
            details: result.error.issues
        });
    }

    req.body = result.data;
    next();
}

export function validateBooks(req, res, next) {
    const result = booksSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid books data',
            details: result.error.issues
        });
    }

    req.body = result.data;
    next();
}

export function validateBookPatch(req, res, next)  {
    const patchBookSchema = bookSchema
     .omit({ is_active: true })
    .strict()
    .partial()
    .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required.' });

    const result = patchBookSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid or missing book fields.',
            details: result.error.issues
        });
    }

    req.body = result.data;

    next();
}

export async function validateBookId(req, res,next) {
    const id = Number(req.params.id);
    
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid id provided"  });
    }

    const hasBook = await existsBook(id);
    if (!hasBook.exists) {
        return res.status(404).json({ error: "Book not found" });
    }

    next();
}