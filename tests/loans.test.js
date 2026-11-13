import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { getPool } from "#database";
import { getJWTSecret } from "#config/environment";

describe("Loans Routes", () => {
    const token = jwt.sign({ test: true }, getJWTSecret());
    const authorization = `Bearer ${token}`;
    const prefix = `jest-loans-${Date.now()}-${process.pid}`;

    const memberIds = [];
    const bookIds = [];

    let counter = 0;

    async function createTestMember(maxLoans = 3) {
        const pool = await getPool();

        const { rows } = await pool.query(
            `INSERT INTO members (name, email, max_loans)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [
                `Test Member ${++counter}`,
                `${prefix}-${counter}@example.com`,
                maxLoans
            ]
        );

        memberIds.push(rows[0].id);
        return rows[0];
    }

    async function createTestBook(totalCount = 2, isActive = true) {
        const pool = await getPool();

        const { rows } = await pool.query(
            `INSERT INTO books
                (title, author, publisher, total_count, available_count, is_active)
             VALUES ($1, $2, $3, $4, $4, $5)
             RETURNING *`,
            [
                `${prefix}-book-${++counter}`,
                "Test Author",
                "Test Publisher",
                totalCount,
                isActive
            ]
        );

        bookIds.push(rows[0].id);
        return rows[0];
    }

    async function getBook(id) {
        const pool = await getPool();

        const { rows } = await pool.query(
            "SELECT * FROM books WHERE id = $1",
            [id]
        );

        return rows[0];
    }

    async function getLoan(id) {
        const pool = await getPool();

        const { rows } = await pool.query(
            "SELECT * FROM loans WHERE id = $1",
            [id]
        );

        return rows[0];
    }

    async function createTestLoan(memberId, bookId, expiresIn = "7d") {
        const res = await request(app)
            .post("/loans")
            .set("Authorization", authorization)
            .send({
                member_id: memberId,
                book_id: bookId,
                expires_in: expiresIn
            });

        expect(res.status).toBe(201);

        const loan = res.body.data ?? res.body;

        expect(Number.isInteger(loan.id)).toBe(true);

        return loan;
    }

    describe("GET /loans", () => {
        let member;
        let book;
        let loan;

        beforeAll(async () => {
            member = await createTestMember();
            book = await createTestBook();
            loan = await createTestLoan(member.id, book.id);
        });

        test("Returns a list of loans", async () => {
            const res = await request(app)
                .get("/loans")
                .set("Authorization", authorization);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test.each([
            ["member_id", "member_id"],
            ["book_id", "book_id"],
            ["active_only", "active_only"]
        ])("Filters by %s", async (_, filter) => {
            let url;

            switch (filter) {
                case "member_id":
                    url = `/loans?member_id=${member.id}`;
                    break;

                case "book_id":
                    url = `/loans?book_id=${book.id}`;
                    break;

                case "active_only":
                    url = `/loans?member_id=${member.id}&active_only=true`;
                    break;
            }

            const res = await request(app)
                .get(url)
                .set("Authorization", authorization);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            expect(
                res.body.some(item => item.id === loan.id)
            ).toBe(true);
        });

        test.each([
            ["?limit=10", 10],
            ["?limit=10000000", 100]
        ])("Respects pagination %s", async (url, max) => {
            const res = await request(app)
                .get("/loans" + url)
                .set("Authorization", authorization);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeLessThanOrEqual(max);
        });

        test("Returns an empty array for an unknown member", async () => {
            const res = await request(app)
                .get("/loans?member_id=2147483647")
                .set("Authorization", authorization);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe("GET /loans/:id", () => {
        test("Returns an existing loan", async () => {
            const member = await createTestMember();
            const book = await createTestBook();
            const loan = await createTestLoan(member.id, book.id);

            const res = await request(app)
                .get(`/loans/${loan.id}`)
                .set("Authorization", authorization);

            expect(res.status).toBe(200);

            const data = res.body.data ?? res.body;

            expect(data.id).toBe(loan.id);
            expect(data.member_id).toBe(member.id);
            expect(data.book_id).toBe(book.id);
        });

        test.each([
            ["abc", 400],
            ["0", 400],
            ["-1", 400],
            ["1.5", 400],
            ["Infinity", 400],
            ["2147483647", 404]
        ])("GET /loans/:id with %s", async (id, status) => {
            const res = await request(app)
                .get(`/loans/${id}`)
                .set("Authorization", authorization);

            expect(res.status).toBe(status);
            expect(typeof res.body.error).toBe("string");
        });
    });

    describe("POST /loans", () => {
        test("Creates a loan and decreases available stock", async () => {
            const member = await createTestMember();
            const book = await createTestBook(2);

            const loan = await createTestLoan(member.id, book.id);

            const updatedBook = await getBook(book.id);
            const storedLoan = await getLoan(loan.id);

            expect(storedLoan.member_id).toBe(member.id);
            expect(storedLoan.book_id).toBe(book.id);
            expect(storedLoan.returned_at).toBeNull();

            expect(updatedBook.total_count).toBe(2);
            expect(updatedBook.available_count).toBe(1);

            expect(
                new Date(storedLoan.expires_at).getTime()
            ).toBeGreaterThan(Date.now());
        });

        test.each(["1d", "7d", "2w", "8w"])(
            "Accepts duration %s",
            async expiresIn => {
                const member = await createTestMember();
                const book = await createTestBook();

                const loan = await createTestLoan(
                    member.id,
                    book.id,
                    expiresIn
                );

                const stored = await getLoan(loan.id);

                expect(stored.expires_at).toBeDefined();
                expect(stored.returned_at).toBeNull();
            }
        );

        test("Converts uppercase weeks correctly", async () => {
            const member = await createTestMember();
            const book = await createTestBook();

            const loan = await createTestLoan(
                member.id,
                book.id,
                "2W"
            );

            const stored = await getLoan(loan.id);

            const durationDays = Math.round(
                (new Date(stored.expires_at).getTime() - Date.now())
                / 86400000
            );

            expect(durationDays).toBe(14);
        });

        test.each([
            ["missing member_id", { book_id: 1, expires_in: "7d" }],
            ["missing book_id", { member_id: 1, expires_in: "7d" }],
            ["missing expires_in", { member_id: 1, book_id: 1 }],
            ["invalid member_id", { member_id: "abc", book_id: 1, expires_in: "7d" }],
            ["invalid book_id", { member_id: 1, book_id: -1, expires_in: "7d" }],
            ["zero duration", { member_id: 1, book_id: 1, expires_in: "0d" }],
            ["duration above maximum", { member_id: 1, book_id: 1, expires_in: "57d" }],
            ["weeks above maximum", { member_id: 1, book_id: 1, expires_in: "9w" }],
            ["unsupported duration unit", { member_id: 1, book_id: 1, expires_in: "1m" }],
            ["invalid duration", { member_id: 1, book_id: 1, expires_in: "abc" }]
        ])("Rejects %s", async (_, body) => {
            const res = await request(app)
                .post("/loans")
                .set("Authorization", authorization)
                .send(body);

            expect(res.status).toBe(400);
        });

        test("Rejects a nonexistent member", async () => {
            const book = await createTestBook();

            const res = await request(app)
                .post("/loans")
                .set("Authorization", authorization)
                .send({
                    member_id: 2147483647,
                    book_id: book.id,
                    expires_in: "7d"
                });

            expect(res.status).toBe(404);
        });

        test("Rejects a nonexistent book", async () => {
            const member = await createTestMember();

            const res = await request(app)
                .post("/loans")
                .set("Authorization", authorization)
                .send({
                    member_id: member.id,
                    book_id: 2147483647,
                    expires_in: "7d"
                });

            expect(res.status).toBe(404);
        });

        test("Rejects an inactive book", async () => {
            const member = await createTestMember();
            const book = await createTestBook(2, false);

            const res = await request(app)
                .post("/loans")
                .set("Authorization", authorization)
                .send({
                    member_id: member.id,
                    book_id: book.id,
                    expires_in: "7d"
                });

            expect(res.status).toBe(404);
        });

        test("Rejects a loan when no copies are available", async () => {
            const member = await createTestMember();
            const book = await createTestBook(1);

            await createTestLoan(member.id, book.id);

            const res = await request(app)
                .post("/loans")
                .set("Authorization", authorization)
                .send({
                    member_id: member.id,
                    book_id: book.id,
                    expires_in: "7d"
                });

            expect(res.status).toBe(409);

            const updatedBook = await getBook(book.id);

            expect(updatedBook.available_count).toBe(0);
        });

        test("Rejects loans above the member limit", async () => {
            const member = await createTestMember(1);
            const book = await createTestBook(3);

            await createTestLoan(member.id, book.id);

            const res = await request(app)
                .post("/loans")
                .set("Authorization", authorization)
                .send({
                    member_id: member.id,
                    book_id: book.id,
                    expires_in: "7d"
                });

            expect(res.status).toBe(409);

            const updatedBook = await getBook(book.id);

            expect(updatedBook.available_count).toBe(2);
        });

        test("Rejects loans when max_loans is zero", async () => {
            const member = await createTestMember(0);
            const book = await createTestBook();

            const res = await request(app)
                .post("/loans")
                .set("Authorization", authorization)
                .send({
                    member_id: member.id,
                    book_id: book.id,
                    expires_in: "7d"
                });

            expect(res.status).toBe(409);

            const updatedBook = await getBook(book.id);

            expect(updatedBook.available_count).toBe(2);
        });
    });

    describe("PATCH /loans/:id/return", () => {
        test("Returns a loan and restores the stock", async () => {
            const member = await createTestMember();
            const book = await createTestBook(2);
            const loan = await createTestLoan(member.id, book.id);

            const beforeReturn = await getBook(book.id);

            expect(beforeReturn.available_count).toBe(1);

            const res = await request(app)
                .patch(`/loans/${loan.id}/return`)
                .set("Authorization", authorization);

            expect(res.status).toBe(200);

            const updatedLoan = await getLoan(loan.id);
            const updatedBook = await getBook(book.id);

            expect(updatedLoan.returned_at).not.toBeNull();
            expect(updatedBook.available_count).toBe(2);
        });

        test("Rejects returning the same loan twice", async () => {
            const member = await createTestMember();
            const book = await createTestBook(1);
            const loan = await createTestLoan(member.id, book.id);

            const first = await request(app)
                .patch(`/loans/${loan.id}/return`)
                .set("Authorization", authorization);

            expect(first.status).toBe(200);

            const second = await request(app)
                .patch(`/loans/${loan.id}/return`)
                .set("Authorization", authorization);

            expect(second.status).toBe(409);

            const updatedBook = await getBook(book.id);

            expect(updatedBook.available_count).toBe(1);
        });

        test.each([
            ["abc", 400],
            ["0", 400],
            ["-1", 400],
            ["2147483647", 404]
        ])("Rejects return with ID %s", async (id, status) => {
            const res = await request(app)
                .patch(`/loans/${id}/return`)
                .set("Authorization", authorization);

            expect(res.status).toBe(status);
        });
    });

    describe("Concurrency", () => {
        test("Prevents borrowing the last copy twice", async () => {
            const memberA = await createTestMember();
            const memberB = await createTestMember();
            const book = await createTestBook(1);

            const bodyA = {
                member_id: memberA.id,
                book_id: book.id,
                expires_in: "7d"
            };

            const bodyB = {
                member_id: memberB.id,
                book_id: book.id,
                expires_in: "7d"
            };

            const results = await Promise.all([
                request(app)
                    .post("/loans")
                    .set("Authorization", authorization)
                    .send(bodyA),

                request(app)
                    .post("/loans")
                    .set("Authorization", authorization)
                    .send(bodyB)
            ]);

            const statuses = results.map(res => res.status).sort();

            expect(statuses).toEqual([201, 409]);

            const updatedBook = await getBook(book.id);

            expect(updatedBook.available_count).toBe(0);

            const pool = await getPool();

            const { rows } = await pool.query(
                `SELECT COUNT(*)::integer AS total
                 FROM loans
                 WHERE book_id = $1 AND returned_at IS NULL`,
                [book.id]
            );

            expect(rows[0].total).toBe(1);
        });

        test("Prevents returning the same loan twice concurrently", async () => {
            const member = await createTestMember();
            const book = await createTestBook(1);
            const loan = await createTestLoan(member.id, book.id);

            const results = await Promise.all([
                request(app)
                    .patch(`/loans/${loan.id}/return`)
                    .set("Authorization", authorization),

                request(app)
                    .patch(`/loans/${loan.id}/return`)
                    .set("Authorization", authorization)
            ]);

            const statuses = results.map(res => res.status).sort();

            expect(statuses).toEqual([200, 409]);

            const updatedBook = await getBook(book.id);
            const updatedLoan = await getLoan(loan.id);

            expect(updatedBook.available_count).toBe(1);
            expect(updatedLoan.returned_at).not.toBeNull();
        });
    });

    describe("Authentication", () => {
        test.each([
            ["GET /loans", "get", "/loans"],
            ["GET /loans/:id", "get", "/loans/1"],
            ["POST /loans", "post", "/loans"],
            ["PATCH /loans/:id/return", "patch", "/loans/1/return"]
        ])("Rejects %s without a token", async (_, method, path) => {
            const res = await request(app)[method](path);

            expect(res.status).toBe(401);
        });

        test("Rejects invalid tokens", async () => {
            const res = await request(app)
                .get("/loans")
                .set("Authorization", "Bearer invalid-token");

            expect(res.status).toBe(403);
        });
    });

    afterAll(async () => {
        const pool = await getPool();

        if (memberIds.length) {
            await pool.query(
                "DELETE FROM loans WHERE member_id = ANY($1::integer[])",
                [memberIds]
            );
        }

        if (bookIds.length) {
            await pool.query(
                "DELETE FROM books WHERE id = ANY($1::integer[])",
                [bookIds]
            );
        }

        if (memberIds.length) {
            await pool.query(
                "DELETE FROM members WHERE id = ANY($1::integer[])",
                [memberIds]
            );
        }

        await pool.end();
    });
});