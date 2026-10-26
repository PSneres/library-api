import express from 'express';
import testRouter from "#routes/test.routes"

const app = express();
app.use(express.json());
app.use("/test", testRouter);

export default app;