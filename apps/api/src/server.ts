import { app } from "./app.js";
import { bootstrapApplication } from "./bootstrap/bootstrap.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function main(): Promise<void> {
  await bootstrapApplication();

  const server = app.listen(env.API_PORT, "0.0.0.0", () => {
    logger.info({ port: env.API_PORT }, "Clinic API listening");
  });

  let shuttingDown = false;

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info({ signal }, "Closing Clinic API");

    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async error => {
      if (error) {
        logger.error({ error }, "HTTP server shutdown failed");
        process.exitCode = 1;
      }

      await prisma.$disconnect();
      clearTimeout(forceExit);
    });
  }

  process.once("SIGINT", signal => {
    void shutdown(signal);
  });
  process.once("SIGTERM", signal => {
    void shutdown(signal);
  });
}

main().catch(async error => {
  logger.fatal({ error }, "Clinic API startup failed");
  await prisma.$disconnect();
  process.exit(1);
});
