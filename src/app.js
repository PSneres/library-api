import express from "express";
import booksRouter from "#routes/books.routes";
import membersRouter from "#routes/members.routes";
import loansRouter from "#routes/loans.routes";
import { errorHandler } from "#middlewares/errors.middleware";

const app = express();
app.use(express.json());
app.use(errorHandler);
app.use("/books",  booksRouter);
app.use("/members", membersRouter);
app.use("/loans",  loansRouter);

export default app;