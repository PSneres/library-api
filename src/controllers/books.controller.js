import { findAllBooks } from "#services/books.service";
import { findById } from "#repositories/books.repository";
import jwt from "jsonwebtoken";

export async function listBooks(req, res) {
    const query = req.query;

    const validQuerys = ['title', 'publisher', 'author'];
    const querys =  validQuerys.map((key) => getQueryValue(query, key));

    const filter = Object.fromEntries(querys);
    filter.available = query.available === "true";
    filter.limit = Number(req.query.limit) || 20;
    filter.offset = Number(req.query.offset) || 0;

    const books = await findAllBooks(filter)
    res.status(200).json(books)
}

export async function getBook(req, res) {
    const id = Number(req.params.id) ;

    if (!Number.isSafeInteger(id) || id < 0) {
        res.status(400).json({
            error: "The ID cannot be empty or invalid."
        });
        return;
    }

    const book = await findById(id);
    if (!book) {
        res.status(404).json({
            error: "Book not found."
        });
        return;
    }

    res.status(200).json(book)
}

function getQueryValue(query, key) {
    const result = query[key];
    const value = [result].flat()[0] ?? '';

    return [key, value];
}