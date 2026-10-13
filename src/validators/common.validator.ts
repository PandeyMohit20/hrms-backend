import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    throw new (requireHttpError())(400, "Invalid request input", details);
  }
  return result.data;
}

function requireHttpError(): typeof import("../utils/api-response.js").HttpError {
  // Kept as a local helper to avoid coupling validators to Express.
  return HttpErrorRef;
}

import { HttpError as HttpErrorRef } from "../utils/api-response.js";
