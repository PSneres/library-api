import express from 'express';
import booksRouter from "#routes/books.routes";
import membersRouter from "#routes/members.routes";

const app = express();
app.use(express.json());
app.use("/books",  booksRouter);
app.use('/members', membersRouter);

export default app;