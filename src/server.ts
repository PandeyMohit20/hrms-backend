import { app } from "./app.js";
import { config } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(config.PORT, "0.0.0.0", () => {
  console.info(`HRMS API listening on http://0.0.0.0:${config.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received; shutting down`);
  server.close(async (error) => {
    if (error) console.error("HTTP server shutdown error", error);
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(error ? 1 : 0);
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
