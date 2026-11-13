# Library API

A RESTful API for managing a library's books, members, and loans. Built with **Node.js, Express 5, and PostgreSQL**, it handles catalog management, lending limits, inventory availability, and returns while protecting data consistency during concurrent operations.

The project follows a layered architecture and includes **JWT authentication, Zod validation, transactional business logic, rate limiting, structured logging, and API integration tests**.

## Features

- **Book management:** browse, filter, create (individually or in bulk), update, deactivate, and reactivate books.
- **Member management:** register members, search records, and manage individual borrowing limits.
- **Lending workflow:** create loans with configurable durations, enforce borrowing limits, and record returns.
- **Inventory consistency:** keep available copies synchronized with loans and returns using PostgreSQL transactions and row-level locks.
- **API safeguards:** Bearer-token authentication, request validation, consistent HTTP error responses, and rate limiting.
- **Integration tests:** exercise endpoints, business rules, authentication, inventory changes, and concurrent requests.

## Tech Stack

| Technology | Role |
| --- | --- |
| Node.js 22+ (ES Modules) | JavaScript runtime |
| Express 5 | HTTP server, routes, and middleware |
| PostgreSQL + `pg` | Relational database, connection pooling, and transactions |
| Zod | Request-body and date-range validation |
| JSON Web Tokens (`jsonwebtoken`) | Authentication for protected endpoints |
| `express-rate-limit` | IP-based request throttling |
| Pino + `pino-pretty` | Structured application logging |
| Jest + Supertest | HTTP integration testing |
| Nodemon + dotenv | Development workflow and environment configuration |

The API works with a PostgreSQL instance hosted on [Neon](https://neon.tech/) or another compatible provider.

## Architecture

The application separates HTTP concerns from business rules and database access:

```text
src/
├── routes/          # Endpoint definitions and middleware composition
├── middlewares/     # JWT, input validation, rate limiting, error handling
├── controllers/     # HTTP request/response handling
├── services/        # Business rules and transactional workflows
├── repositories/    # Parameterized PostgreSQL queries
├── schemas/         # Zod validation schemas
├── database/        # Pool, transaction helper, schema, and SQL seeds
├── scripts/         # Schema setup, data seeding, and token generation
├── config/          # Environment variable access
├── utils/           # Query normalization, numeric bounds, logging
├── app.js           # Express application configuration
└── server.js        # Server entry point

tests/               # Books, members, and loans integration tests
```

**Request flow:** `Route → Middleware → Controller → Service (when business logic is needed) → Repository → PostgreSQL`.

Repositories handle SQL access, while services coordinate cross-table rules. For example, creating a loan checks the member and book, inserts the loan, and updates book availability within one transaction.

## Getting Started

### Requirements

- Node.js **22 or later** and npm
- An accessible PostgreSQL database

### Installation

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```dotenv
   DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
   JWT_SECRET=replace_with_a_long_random_secret
   PORT=3000
   NODE_ENV=development
   ```

   `DATABASE_URL` and `JWT_SECRET` are required. `PORT` defaults to `3000`. Use the SSL settings required by your PostgreSQL provider. **Do not commit real credentials.**

3. Initialize the database schema:

   ```bash
   npm run db:setup --force=true
   ```

   **Warning:** this command **drops and recreates** the `books`, `members`, and `loans` tables. The CLI displays the database connection details and asks you to type the database username to confirm. Only use it on a database you intend to reset.

4. Optionally load the bundled sample dataset:

   ```bash
   npm run db:seed
   ```

   The full seed requires empty tables. It inserts books and members before loans, since loans reference their IDs.

5. Start the server:

   ```bash
   npm run dev
   ```

   By default, the API runs at `http://localhost:3000`.

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with Nodemon |
| `npm start` | Start the server with Node.js |
| `npm run db:setup --force=true` | Reset and recreate the schema (destructive; requires confirmation) |
| `npm run db:seed` | Load all bundled seeds when the tables are empty |
| `npm run db:seed -- books` | Seed the `books` table |
| `npm run db:seed -- members` | Seed the `members` table |
| `npm run db:seed -- loans` | Seed the `loans` table; referenced books and members must exist |
| `npm run token -- admin 30d` | Generate a JWT valid for 30 days |
| `npm test` | Run integration tests with Jest and Supertest |

## Authentication

Protected routes require an `Authorization` header:

```http
Authorization: Bearer <token>
```

Generate a token through the included CLI:

```bash
npm run token -- admin 30d
```

The script signs a JWT using `JWT_SECRET`, sets the supplied identifier as its `sub` claim, and applies the requested expiration. **This project does not implement an HTTP login endpoint**; tokens are generated through the CLI.

- **Public:** `GET /books`, `GET /books/:id`.
- **JWT required:** all other book endpoints and all member and loan endpoints.
- Missing or malformed token → `401`; invalid or expired token → `403`.

## API Reference

All examples use the default base URL `http://localhost:3000`. Protected requests must include the Bearer token above. Request bodies are JSON.

### Books — `/books`

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/books` | List books with filters and pagination | Public |
| `GET` | `/books/:id` | Retrieve an active book | Public |
| `POST` | `/books` | Create one book | JWT |
| `POST` | `/books/bulk` | Create 1–100 books | JWT |
| `PATCH` | `/books/:id` | Update book information or total copy count | JWT |
| `DELETE` | `/books/:id` | Deactivate a book (soft delete) | JWT |
| `PATCH` | `/books/:id/reactivate` | Reactivate a book | JWT |

**Listing filters** (`GET /books`):

| Query parameter | Behavior |
| --- | --- |
| `title`, `author`, `publisher` | Case-insensitive partial text matches |
| `available=true` | Require `available_count > 0` |
| `is_active=false` | List inactive books instead of active books |
| `limit`, `offset` | Default limit `20`, maximum `100`; offset defaults to `0` |

```http
GET /books?title=ocean&available=true&limit=10&offset=0
```

**Create a book** (`POST /books`):

```json
{
  "title": "The Last Lighthouse",
  "author": "A. Rivers",
  "publisher": "North Shore Press",
  "total_count": 5
}
```

`title` and `author` are required; `publisher` is optional and defaults to `Unknown`. `total_count` must be a positive integer (maximum `10000`). A new book starts with all copies available and is active by default.

**Bulk creation** (`POST /books/bulk`) takes an array of 1–100 book objects:

```json
[
  { "title": "Book A", "author": "Author A", "total_count": 3 },
  { "title": "Book B", "author": "Author B", "total_count": 2 }
]
```

**Partial update** (`PATCH /books/:id`):

```json
{
  "title": "The Last Lighthouse — Revised",
  "total_count": 7
}
```

The PATCH accepts `title`, `author`, `publisher`, and `total_count`; an empty body or an unknown field is rejected. `available_count` is **managed by the application**, not directly edited through this endpoint. Changing `total_count` adjusts available stock without changing how many copies are currently borrowed. Changes that violate inventory constraints are rejected.

`DELETE` sets `is_active = false` instead of removing the record. Inactive books are excluded from default listings and cannot be borrowed; use the dedicated reactivation endpoint to restore them.

### Members — `/members`

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/members` | List members with filters and pagination | JWT |
| `GET` | `/members/:id` | Retrieve a member | JWT |
| `POST` | `/members` | Create one member | JWT |
| `POST` | `/members/bulk` | Create 1–100 members | JWT |
| `PATCH` | `/members/:id` | Update member information or loan limit | JWT |

**Listing filters** (`GET /members`): `name`, `email` (partial matches), `max_loans` (exact value), `created_from`, `created_to` (inclusive dates in `YYYY-MM-DD` format), `limit`, and `offset`.

```http
GET /members?name=ana&created_from=2026-01-01&limit=20
```

**Create a member** (`POST /members`):

```json
{
  "name": "Ana Oliveira",
  "email": "ana@example.com",
  "max_loans": 3
}
```

All three fields are required by the HTTP validation schema. `max_loans` must be an integer from **0 to 10**. `created_at` is set by the server.

`POST /members/bulk` accepts an array of 1–100 objects with the same fields. `PATCH /members/:id` accepts changes to `name`, `email`, or `max_loans`, but **not** `created_at`.

A member's `max_loans` cannot be reduced below their existing number of active loans; the service checks this rule transactionally.

### Loans — `/loans`

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/loans` | List loans with filters and pagination | JWT |
| `GET` | `/loans/:id` | Retrieve a loan | JWT |
| `POST` | `/loans` | Create a loan | JWT |
| `PATCH` | `/loans/:id/return` | Return a borrowed book | JWT |

**Listing filters** (`GET /loans`):

| Query parameter | Behavior |
| --- | --- |
| `member_id`, `book_id` | Filter by associated record |
| `active_only=true` | Only loans with `returned_at IS NULL` |
| `created_from`, `created_to` | Loan creation date range |
| `expires_from`, `expires_to` | Due date range |
| `returned_from`, `returned_to` | Return date range |
| `limit`, `offset` | Default limit `20`, maximum `100`; offset defaults to `0` |

Date-range values use `YYYY-MM-DD`. Each `from` value must not be later than its corresponding `to`.

```http
GET /loans?member_id=8&active_only=true&expires_to=2026-12-31
```

**Create a loan** (`POST /loans`):

```json
{
  "member_id": 8,
  "book_id": 15,
  "expires_in": "2w"
}
```

`expires_in` accepts a positive number of **days (`d`) or weeks (`w`)**, case-insensitively, with a maximum of **56 days** (`8w`). The server calculates `expires_at` and records the creation timestamp.

The request succeeds only when the member exists and has room under `max_loans`, and the book is active with at least one available copy. Creating the loan decreases `available_count` by one.

**Return a loan** (`PATCH /loans/:id/return`): no request body is needed. The server sets `returned_at` using PostgreSQL's `NOW()` and restores one available copy. Returning an already-returned loan produces `409 Conflict`.

## Data Model and Integrity

```mermaid
erDiagram
    MEMBERS ||--o{ LOANS : borrows
    BOOKS ||--o{ LOANS : appears_in

    MEMBERS {
        int id PK
        text name
        text email
        date created_at
        smallint max_loans
    }
    BOOKS {
        int id PK
        text title
        text author
        text publisher
        int total_count
        int available_count
        boolean is_active
    }
    LOANS {
        int id PK
        timestamptz created_at
        timestamptz expires_at
        timestamptz returned_at
        int member_id FK
        int book_id FK
    }
```

Each member can have multiple loans, and each book can be referenced by multiple loan records. A loan is considered **active** when `returned_at` is `NULL`, even if its due date has passed. Returned loans remain in the database as history.

Inventory rules:

- `total_count` represents **all copies**, including borrowed copies; it must be at least 1.
- `available_count` represents copies available to lend; it may be 0 and cannot exceed `total_count`.
- Borrowed copies are derived as `total_count - available_count`.
- Reducing total stock cannot invalidate copies currently on loan.

### Transactions and Concurrency

Loan creation, returns, and stock-sensitive updates use a shared transaction helper (`BEGIN` / `COMMIT` / `ROLLBACK`). Critical rows are locked with **`SELECT ... FOR UPDATE`** before checking limits or updating inventory.

This prevents concurrent requests from borrowing the same last available copy or recording a return twice. Database changes inside a workflow use the same PostgreSQL client, so a failed operation does not leave the loan and inventory out of sync.

The schema also enforces foreign keys between loans, books, and members, numeric stock constraints, and date consistency checks.

## Responses and Error Handling

| Status | Typical meaning |
| --- | --- |
| `200 OK` | Successful read, update, or return |
| `201 Created` | Resource successfully created |
| `400 Bad Request` | Invalid request, ID, date range, or stock/limit update |
| `401 Unauthorized` | Missing or malformed Bearer token |
| `403 Forbidden` | Invalid or expired JWT |
| `404 Not Found` | Resource does not exist or is not accessible through the requested lookup |
| `409 Conflict` | No available copies, member loan limit reached, or loan already returned |
| `429 Too Many Requests` | Request limit exceeded |
| `500 Internal Server Error` | Unexpected server failure |

Typical error response:

```json
{ "error": "This loan has already been returned." }
```

Validation failures may also include a `details` array of Zod issues. The Express error handler is intended to keep unexpected internal errors out of client-facing responses.

## Testing

```bash
npm test
```

Integration tests use **Jest and Supertest** to exercise book, member, and loan endpoints, including request validation, JWT checks, borrowing limits, inventory updates, returns, and concurrent requests.

> **Database safety:** these tests use `DATABASE_URL` and execute real SQL writes. Run them against a database reserved for testing, not against production or data you need to preserve.

## Logging and Rate Limiting

- **Pino** records structured events for resource changes, server startup, and unexpected failures. In development, `pino-pretty` formats terminal output; JSON logs are also written to `./logs/app.log`.
- **Rate limiting** allows up to **100 requests per 15-minute window per IP**. Excess requests receive `429 Too Many Requests` with a JSON error response.
- Rate-limit headers follow the configured `draft-8` format. When deploying behind a proxy, configure Express's proxy trust settings for that environment.

## License

Licensed under the [MIT License](LICENSE).
