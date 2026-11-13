import "dotenv/config";
import app from "./app.js";
import { logger } from "#utils/logger";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info("SERVER_START");
});