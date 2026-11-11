import request from "supertest";
import app from "../src/app.js";
import { getPool } from "#database";

describe("Books API", () => {
    test("Should reject an invalid book ID", async () => {
        const res = await request(app).get("/books/invalid");

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
    });

    test("Return status 200 and a list of books", async () => {
        const res = await request(app).get("/books?limit=100");
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
         expect(res.headers['content-type']).toMatch(/json/);
    })

    test("Return status code 404", async () => {
        const res = await request(app).get("/books/20000");
        
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("error");
    })
});

afterAll(async () => {
    const pool = await getPool();
    await pool.end();
});