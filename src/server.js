import "dotenv/config";
import app from "./app.js";
import { logger } from "#utils/logger";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(
      { action: "SERVER_START", PORT },
      `Server started on port ${PORT}`
  );

  console.log(`Server started on port ${PORT}`)
});