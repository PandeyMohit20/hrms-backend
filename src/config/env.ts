import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:5174"),
  ATTENDANCE_TIMEZONE: z.string().default("Asia/Kolkata"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const config = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
};

try {
  new Intl.DateTimeFormat("en-US", { timeZone: config.ATTENDANCE_TIMEZONE });
} catch {
  throw new Error("ATTENDANCE_TIMEZONE must be a valid IANA timezone, such as Asia/Kolkata");
}
