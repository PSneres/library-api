DROP TABLE IF EXISTS loans, books, members;

CREATE TABLE IF NOT EXISTS members(
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    max_loans SMALLINT NOT NULL DEFAULT 3 CHECK (max_loans BETWEEN 0 AND 10)
);

CREATE TABLE IF NOT EXISTS books(
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT 'Unknown',
  total_count INT NOT NULL CHECK (total_count > 0),
  available_count INT NOT NULL CHECK (
    available_count >= 0 AND available_count <= total_count
  ),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS loans(
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at > created_at),
  returned_at TIMESTAMPTZ CHECK(returned_at > created_at),
  member_id INT NOT NULL REFERENCES members(id),
  book_id INT NOT NULL REFERENCES books(id)
);

CREATE INDEX IF NOT EXISTS idx_loans_member_id ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_book_id ON loans(book_id);