import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();
healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, message: "HRMS API is healthy", data: { database: "connected" } });
  } catch {
    res.status(503).json({ success: false, message: "Database is unavailable", errors: [] });
  }
});
