import app from "./app";
import { logger } from "./lib/logger";
import { schemaReady } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Make sure any columns the schema expects actually exist on the live
// database before we start accepting requests, so we don't serve 500s for
// "column does not exist" while auto-migration is still running.
await schemaReady;

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
