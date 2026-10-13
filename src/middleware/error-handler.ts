import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/api-response.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, message: error.message, errors: error.errors });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ success: false, message: "A record with these unique values already exists", errors: [] });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ success: false, message: "Requested record was not found", errors: [] });
      return;
    }
    if (error.code === "P2003") {
      res.status(400).json({ success: false, message: "A referenced record does not exist", errors: [] });
      return;
    }
  }
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ success: false, message: "Malformed JSON request body", errors: [] });
    return;
  }
  const status = (error as { status?: number })?.status;
  if (status === 413) {
    res.status(413).json({ success: false, message: "Request body is too large", errors: [] });
    return;
  }
  if (process.env.NODE_ENV !== "production") console.error(error);
  res.status(500).json({ success: false, message: "An unexpected server error occurred", errors: [] });
};
