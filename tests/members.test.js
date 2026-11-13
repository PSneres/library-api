import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { getPool } from "#database";
import { getJWTSecret } from "#config/environment";

describe("Members Routes", () => {
    const token = jwt.sign({ test: true }, getJWTSecret());
    const authorization = `Bearer ${token}`;
    const prefix = `jest-members-${Date.now()}-${process.pid}`;

    let counter = 0;

    function makeMember(changes = {}) {
        return {
            name: `Test Member ${++counter}`,
            email: `${prefix}-${counter}@example.com`,
            max_loans: 3,
            ...changes
        };
    }

    async function createTestMember(changes = {}) {
        const res = await request(app)
            .post("/members")
            .set("Authorization", authorization)
            .send(makeMember(changes));

        expect(res.status).toBe(201);

        const member = res.body.data ?? res.body;
        expect(Number.isInteger(member.id)).toBe(true);

        return member;
    }

    async function findMemberInDatabase(id) {
        const pool = await getPool();

        const { rows } = await pool.query(
            "SELECT * FROM members WHERE id = $1",
            [id]
        );

        return rows[0];
    }

    describe("GET /members", () => {
        test("Returns a list of members", async () => {
            const res = await request(app)
                .get("/members")
                .set("Authorization", authorization);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test.each([
            ["?limit=10", members => members.length <= 10],
            ["?limit=10000000", members => members.length <= 100]
        ])("GET /members with query %s", async (url, validate) => {
            const res = await request(app)
                .get("/members" + url)
                .set("Authorization", authorization);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(validate(res.body)).toBe(true);
        });

        test("Returns an empty array when no members match", async () => {
            const res = await request(app)
                .get(`/members?email=nonexistent-${prefix}@example.com`)
                .set("Authorization", authorization);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe("GET /members/:id", () => {
        test("Returns an existing member", async () => {
            const member = await createTestMember();

            const res = await request(app)
                .get(`/members/${member.id}`)
                .set("Authorization", authorization);

            expect(res.status).toBe(200);

            const data = res.body.data ?? res.body;

            expect(data.id).toBe(member.id);
            expect(data.email).toBe(member.email);
        });

        test.each([
            ["abc", 400],
            ["0", 400],
            ["-1", 400],
            ["1.5", 400],
            ["Infinity", 400],
            ["2147483647", 404]
        ])("GET /members/:id with %s", async (id, status) => {
            const res = await request(app)
                .get(`/members/${id}`)
                .set("Authorization", authorization);

            expect(res.status).toBe(status);
            expect(typeof res.body.error).toBe("string");
        });
    });

    describe("POST /members", () => {
        test("Creates a valid member", async () => {
            const member = await createTestMember();

            expect(member.name).toBeDefined();
            expect(member.email).toContain("@example.com");
            expect(member.max_loans).toBe(3);
        });

        test.each([
            ["missing name", { email: "test@example.com" }],
            ["missing email", { name: "Test" }],
            ["empty name", { name: "", email: "test@example.com" }],
            ["invalid email", { name: "Test", email: "invalid-email" }],
            ["negative max_loans", { name: "Test", email: "test@example.com", max_loans: -1 }],
            ["max_loans above 10", { name: "Test", email: "test@example.com", max_loans: 11 }],
            ["invalid max_loans type", { name: "Test", email: "test@example.com", max_loans: "3" }]
        ])("Rejects %s", async (_, body) => {
            const res = await request(app)
                .post("/members")
                .set("Authorization", authorization)
                .send(body);

            expect(res.status).toBe(400);
        });

        test("Allows max_loans equal to zero", async () => {
            const member = await createTestMember({
                max_loans: 0
            });

            expect(member.max_loans).toBe(0);
        });
    });

    describe("POST /members/bulk", () => {
        test("Creates multiple members", async () => {
            const members = [makeMember(), makeMember()];

            const res = await request(app)
                .post("/members/bulk")
                .set("Authorization", authorization)
                .send(members);

            expect(res.status).toBe(201);

            const pool = await getPool();

            for (const member of members) {
                const { rows } = await pool.query(
                    "SELECT * FROM members WHERE email = $1",
                    [member.email]
                );

                expect(rows).toHaveLength(1);
            }
        });

        test("Rejects an empty array", async () => {
            const res = await request(app)
                .post("/members/bulk")
                .set("Authorization", authorization)
                .send([]);

            expect(res.status).toBe(400);
        });

        test("Does not insert a partially invalid batch", async () => {
            const validMember = makeMember();

            const res = await request(app)
                .post("/members/bulk")
                .set("Authorization", authorization)
                .send([
                    validMember,
                    makeMember({ email: "invalid-email" })
                ]);

            expect(res.status).toBe(400);

            const pool = await getPool();

            const { rows } = await pool.query(
                "SELECT id FROM members WHERE email = $1",
                [validMember.email]
            );

            expect(rows).toHaveLength(0);
        });
    });

    describe("PATCH /members/:id", () => {
        test("Updates a member without changing other fields", async () => {
            const member = await createTestMember();

            const res = await request(app)
                .patch(`/members/${member.id}`)
                .set("Authorization", authorization)
                .send({ name: "Updated Member" });

            expect(res.status).toBe(200);

            const updated = await findMemberInDatabase(member.id);

            expect(updated.name).toBe("Updated Member");
            expect(updated.email).toBe(member.email);
            expect(updated.max_loans).toBe(3);
        });

        test.each([0, 5, 10])(
            "Updates max_loans to %s",
            async max_loans => {
                const member = await createTestMember();

                const res = await request(app)
                    .patch(`/members/${member.id}`)
                    .set("Authorization", authorization)
                    .send({ max_loans });

                expect(res.status).toBe(200);

                const updated = await findMemberInDatabase(member.id);

                expect(updated.max_loans).toBe(max_loans);
            }
        );

        test.each([
            ["empty body", {}],
            ["unknown field", { unknown_field: true }],
            ["created_at modification", { created_at: "2025-01-01" }],
            ["empty name", { name: "" }],
            ["invalid email", { email: "invalid" }],
            ["negative max_loans", { max_loans: -1 }],
            ["max_loans above 10", { max_loans: 11 }],
            ["invalid max_loans type", { max_loans: "5" }]
        ])("Rejects %s", async (_, body) => {
            const member = await createTestMember();

            const res = await request(app)
                .patch(`/members/${member.id}`)
                .set("Authorization", authorization)
                .send(body);

            expect(res.status).toBe(400);
        });

        test("Cannot reduce max_loans below active loans", async () => {
            const member = await createTestMember();
            const pool = await getPool();

            const { rows } = await pool.query(
                `INSERT INTO books
                    (title, author, publisher, total_count, available_count)
                 VALUES ($1, $2, $3, 1, 0)
                 RETURNING id`,
                [`${prefix}-Loan Book`, "Test Author", "Test Publisher"]
            );

            const bookId = rows[0].id;

            try {
                await pool.query(
                    `INSERT INTO loans
                        (member_id, book_id, expires_at)
                     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
                    [member.id, bookId]
                );

                const res = await request(app)
                    .patch(`/members/${member.id}`)
                    .set("Authorization", authorization)
                    .send({ max_loans: 0 });

                expect(res.status).toBe(400);

                const stored = await findMemberInDatabase(member.id);

                expect(stored.max_loans).toBe(3);
            } finally {
                await pool.query(
                    "DELETE FROM loans WHERE member_id = $1 AND book_id = $2",
                    [member.id, bookId]
                );

                await pool.query(
                    "DELETE FROM books WHERE id = $1",
                    [bookId]
                );
            }
        });
    });

    describe("Authentication", () => {
        test.each([
            ["GET /members", "get", "/members"],
            ["GET /members/:id", "get", "/members/1"],
            ["POST /members", "post", "/members"],
            ["POST /members/bulk", "post", "/members/bulk"]
        ])("Rejects %s without a token", async (_, method, path) => {
            const res = await request(app)[method](path);

            expect(res.status).toBe(401);
        });

        test("Rejects PATCH without a token", async () => {
            const member = await createTestMember();

            const res = await request(app)
                .patch(`/members/${member.id}`)
                .send({ name: "Unauthorized Update" });

            expect(res.status).toBe(401);
        });

        test("Rejects an invalid token", async () => {
            const res = await request(app)
                .get("/members")
                .set("Authorization", "Bearer invalid-token");

            expect(res.status).toBe(403);
        });
    });

    afterAll(async () => {
        const pool = await getPool();

        await pool.query(
            "DELETE FROM members WHERE email LIKE $1",
            [`${prefix}%`]
        );

        await pool.end();
    });
});