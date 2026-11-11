import * as z from "zod";

export const bookSchema = z.object({
    title: z.string().trim().min(1).max(255),
    author: z.string().trim().min(1).max(150),
    publisher: z.string().trim().min(1).max(150).optional(),
    total_count: z.number().int().positive().max(10000),
    is_active: z.boolean().default(true)
});

export const booksSchema = z.array(bookSchema).min(1).max(100);