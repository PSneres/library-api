import express from 'express';
import testRouter from "#routes/test.routes"
import booksRouter from "#routes/books.routes";
import "#database";

const app = express();
app.use(express.json());
app.use("/test", testRouter);
app.use("/books",  booksRouter);

export default app;