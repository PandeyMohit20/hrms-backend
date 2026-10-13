import { z } from "zod";
import { paginationSchema } from "./common.validator.js";

export const companyListSchema = paginationSchema;
export const companyIdSchema = z.object({ id: z.string().uuid() });
export const companyCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(50),
}).strict();
