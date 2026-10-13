import { EmployeeStatus } from "@prisma/client";
import { z } from "zod";
import { paginationSchema } from "./common.validator.js";

const optionalUuid = z.string().uuid().optional();
export const employeeIdSchema = z.object({ id: z.string().uuid() });
export const employeeListSchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  companyId: optionalUuid,
  branchId: optionalUuid,
  departmentId: optionalUuid,
  status: z.nativeEnum(EmployeeStatus).optional(),
});
export const employeeCreateSchema = z.object({
  employeeCode: z.string().trim().min(1).max(100),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  joiningDate: z.string().date(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
}).strict();
