import { findAllBooks, modifyBookStock } from "#services/books.service";
import { bulkInsertBooks, findById, insertBook, removeBook, activeBook } from "#repositories/books.repository";
import { getQueryValue } from "#utils/normalizeQueryValue";

export async function listBooks(req, res) {
    const query = req.query;

    const validQuerys = ['title', 'publisher', 'author'];
    const querys =  validQuerys.map((key) => getQueryValue(query, key));

    const filter = Object.fromEntries(querys);
    filter.available = getQueryValue(query, 'available')[1].toLowerCase() === "true";
    filter.is_active = getQueryValue(query, 'is_active')[1].toLowerCase() !== "false";
    filter.limit = Number(req.query.limit) || 20;
    filter.offset = Number(req.query.offset) || 0;

    const books = await findAllBooks(filter)
    res.status(200).json(books);
}

export async function getBook(req, res) {
    const book = await findById(req.params.id);
    res.status(200).json(book)
}

export async function addBook(req, res)  {
    const book = await insertBook(req.body);
    res.status(201).json(book);
}

export async function addBooks(req, res) {
    const books = await bulkInsertBooks(req.body)
    res.status(201).json(books);
}

export async function modifyBook(req, res) {
    const result = await modifyBookStock(req.params.id, req.body);

    if (!result.success) {
        return res.status(result.status).json({ error: result.error });
    }

    res.status(result.status).json(result.data);
}

export async function deleteBook(req, res) {
    const inactiveBook = await removeBook(req.params.id);
    res.status(200).json(inactiveBook);
}

export async function reactivateBook(req, res) {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 0) {
        res.status(400).json({
            error: "The ID cannot be empty or invalid."
        });
        return;
    }
    const { book, rowCount } = await activeBook(id);

    if (rowCount <= 0) {
        res.status(409).json({ error: "This book is not inactive or not exists" });
        return;
    }

    res.status(200).send(book)
}