import request from "supertest";
import app from "../src/app.js";
import { getPool } from "#database";
import { bookSchema } from "#schemas/books.schema";
import jwt from "jsonwebtoken";
import { getJWTSecret } from "#config/environment";

describe("Books Routes", () => {
    test.each([
        ["", 200, () => true],
        ["?title=afugadasgalinhas", 200, book => book.length === 0],
        ["?title=nossos&author=amélia&publisher=editora", 200,  book => book.length === 1],
        ["?available=true", 200, books => books.every(book => book.available_count > 0) && books.length > 0],
        ["?is_active=false", 200, books => books.every(book => !book.is_active) && books.length > 0],
        ["?limit=20", 200, books => books.length <= 20],
        ["?limit=10000000", 200, books => books.length <= 100]
    ])('GET /books with query %s', async (url, status, validate) => {
        const res = await request(app).get("/books" + url);

        expect(res.status).toBe(status);
        expect(Array.isArray(res.body)).toBe(true);
        expect(validate(res.body)).toBe(true);
    });

    test.each([
        [10, 200],
        [408945, 404],
        ['aa', 400],
        [Infinity, 400],
        [40, 404]
    ])("GET /books/:id with %s", async (id, status) => {
        const res = await request(app).get(`/books/${id}`);

        expect(res.status).toBe(status)
        if (status === 200) {
            expect(bookSchema.validate(res.body)).toBe(true);
        } else {
            expect(typeof (res.body.error)).toBe('string');
        }
    });


describe("Books Mutation Routes", () => {
    const token = jwt.sign({ test: true }, getJWTSecret());
    const authorization = `Bearer ${token}`;
    const createdIds = [];
    const prefix = `jest-books-${Date.now()}-${process.pid}`;

    let counter = 0;

    function makeBook(changes = {}) {
        return {
            title: `${prefix}-${++counter}`,
            author: "Test Author",
            publisher: "Test Publisher",
            total_count: 3,
            ...changes
        };
    }

    async function createTestBook(changes = {}) {
        const res = await request(app)
            .post("/books")
            .set("Authorization", authorization)
            .send(makeBook(changes));

        expect(res.status).toBe(201);

        const book = res.body.data ?? res.body;
        expect(Number.isInteger(book.id)).toBe(true);

        createdIds.push(book.id);
        return book;
    }

    async function findBookInDatabase(id) {
        const pool = await getPool();
        const { rows } = await pool.query(
            "SELECT * FROM books WHERE id = $1",
            [id]
        );

        return rows[0];
    }

    describe("POST /books", () => {
        test("Creates a valid book", async () => {
            const book = await createTestBook();

            expect(bookSchema.validate(book)).toBe(true);
            expect(book.available_count).toBe(3);
            expect(book.total_count).toBe(3);
        });

        test("Applies the default publisher", async () => {
            const book = await createTestBook({
                publisher: undefined
            });

            expect(book.publisher).toBe("Unknown");
        });

        test.each([
            ["missing title", { author: "Author", total_count: 3 }],
            ["missing author", { title: "Title", total_count: 3 }],
            ["zero stock", { title: "Title", author: "Author", total_count: 0 }],
            ["negative stock", { title: "Title", author: "Author", total_count: -2 }],
            ["invalid stock type", { title: "Title", author: "Author", total_count: "3" }]
        ])("Rejects %s", async (_, body) => {
            const res = await request(app)
                .post("/books")
                .set("Authorization", authorization)
                .send(body);

            expect(res.status).toBe(400);
        });
    });

    describe("POST /books/bulk", () => {
        test("Creates multiple books", async () => {
            const books = [makeBook(), makeBook()];

            const res = await request(app)
                .post("/books/bulk")
                .set("Authorization", authorization)
                .send(books);

            expect(res.status).toBe(201);

            const pool = await getPool();

            for (const book of books) {
                const { rows } = await pool.query(
                    "SELECT id FROM books WHERE title = $1",
                    [book.title]
                );

                expect(rows).toHaveLength(1);
                createdIds.push(rows[0].id);
            }
        });

        test.each([
            ["empty array", []],
            ["more than 100 books", Array.from({ length: 101 }, (_, i) =>
                makeBook({ title: `${prefix}-bulk-${i}` })
            )],
            ["invalid book", [makeBook(), makeBook({ total_count: 0 })]]
        ])("Rejects %s", async (_, body) => {
            const res = await request(app)
                .post("/books/bulk")
                .set("Authorization", authorization)
                .send(body);

            expect(res.status).toBe(400);
        });
    });

    describe("PATCH /books/:id", () => {
        test("Updates fields without changing other data", async () => {
            const book = await createTestBook();

            const res = await request(app)
                .patch(`/books/${book.id}`)
                .set("Authorization", authorization)
                .send({ title: "Updated Test Title" });

            expect(res.status).toBe(200);

            const updated = await findBookInDatabase(book.id);

            expect(updated.title).toBe("Updated Test Title");
            expect(updated.author).toBe(book.author);
            expect(updated.total_count).toBe(3);
        });

        test("Increases total and available stock", async () => {
            const book = await createTestBook();

            const res = await request(app)
                .patch(`/books/${book.id}`)
                .set("Authorization", authorization)
                .send({ total_count: 5 });

            expect(res.status).toBe(200);

            const updated = await findBookInDatabase(book.id);

            expect(updated.total_count).toBe(5);
            expect(updated.available_count).toBe(5);
        });

        test.each([
            ["empty body", {}],
            ["unknown field", { unknown_field: true }],
            ["zero total", { total_count: 0 }],
            ["negative available stock", { available_count: -1 }],
            ["available stock exceeds total", { available_count: 999 }],
            ["invalid title type", { title: 123 }]
        ])("Rejects %s", async (_, body) => {
            const book = await createTestBook();

            const res = await request(app)
                .patch(`/books/${book.id}`)
                .set("Authorization", authorization)
                .send(body);

            expect(res.status).toBe(400);
        });
    });

    describe("DELETE and Reactivate /books/:id", () => {
        test("Soft deletes and reactivates a book", async () => {
            const book = await createTestBook();

            const deleted = await request(app)
                .delete(`/books/${book.id}`)
                .set("Authorization", authorization);

            expect(deleted.status).toBe(200);

            let stored = await findBookInDatabase(book.id);
            expect(stored).toBeDefined();
            expect(stored.is_active).toBe(false);

            const reactivated = await request(app)
                .patch(`/books/${book.id}/reactivate`)
                .set("Authorization", authorization);

            expect(reactivated.status).toBe(200);

            stored = await findBookInDatabase(book.id);

            expect(stored.is_active).toBe(true);
            expect(stored.available_count).toBe(book.available_count);
        });
    });

    describe("Authentication", () => {
        test.each([
            ["missing token", undefined, 401],
            ["invalid token", "Bearer invalid-token", 403]
        ])("POST /books with %s", async (_, auth, status) => {
            let req = request(app)
                .post("/books")
                .send(makeBook());

            if (auth) req = req.set("Authorization", auth);

            const res = await req;

            expect(res.status).toBe(status);
        });

        test("Protects book mutation routes", async () => {
            const book = await createTestBook();

            const requests = [
                request(app).patch(`/books/${book.id}`).send({ title: "Changed" }),
                request(app).delete(`/books/${book.id}`),
                request(app).patch(`/books/${book.id}/reactivate`)
            ];

            for (const req of requests) {
                const res = await req;
                expect(res.status).toBe(401);
            }
        });
    });

    afterAll(async () => {
        if (!createdIds.length) return;

        const pool = await getPool();

        await pool.query(
            "DELETE FROM books WHERE id = ANY($1::integer[])",
            [createdIds]
        );
    });
  });
});

afterAll(async () => {
    const pool = await getPool();
    await pool.end();
});