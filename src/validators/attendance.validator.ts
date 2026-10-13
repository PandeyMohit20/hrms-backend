import { AttendanceSource, AttendanceStatus } from "@prisma/client";
import { z } from "zod";
import { paginationSchema } from "./common.validator.js";

const latitude = z.number().finite().min(-90).max(90).optional();
const longitude = z.number().finite().min(-180).max(180).optional();
export const attendanceIdSchema = z.object({ id: z.string().uuid() });
export const attendanceListSchema = paginationSchema.extend({
  employeeId: z.string().uuid().optional(),
  attendanceDate: z.string().date().optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  companyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
}).refine((v) => !(v.fromDate && v.toDate) || v.fromDate <= v.toDate, { message: "fromDate must be on or before toDate", path: ["fromDate"] });
export const checkInSchema = z.object({
  employeeId: z.string().uuid(),
  latitude,
  longitude,
  source: z.nativeEnum(AttendanceSource).default(AttendanceSource.WEB),
}).strict();
export const checkOutSchema = z.object({
  employeeId: z.string().uuid(),
  latitude,
  longitude,
}).strict();
