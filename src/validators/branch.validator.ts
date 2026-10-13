import { z } from "zod";
import { paginationSchema } from "./common.validator.js";

export const branchIdSchema = z.object({ id: z.string().uuid() });
export const branchListSchema = paginationSchema.extend({
  companyId: z.string().uuid().optional(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});
export const branchCreateSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(50),
  address: z.string().trim().max(1000).nullable().optional(),
  latitude: z.coerce.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().finite().min(-180).max(180).nullable().optional(),
  radiusM: z.number().int().min(1).max(100000).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => (value.latitude == null) === (value.longitude == null), {
  message: "latitude and longitude must be provided together",
  path: ["latitude"],
});
