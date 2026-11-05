import { findAllBooks } from "#services/books.service";

export async function getAllBooks(req, res) {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const books = await findAllBooks({ limit, offset });

    res.status(200).json(books);
}