import type { RequestHandler } from "express";
import { checkIn, checkOut, getAttendance, listAttendance } from "../services/attendance.service.js";
import { attendanceIdSchema, attendanceListSchema, checkInSchema, checkOutSchema } from "../validators/attendance.validator.js";
import { parseOrThrow } from "../validators/common.validator.js";
import { sendPaginated, sendSuccess } from "../utils/api-response.js";

export const list: RequestHandler = async (req, res) => {
  const args = parseOrThrow(attendanceListSchema, req.query);
  const result = await listAttendance(args);
  sendPaginated(res, "Attendance records retrieved successfully", result.items, args.page, args.limit, result.total);
};
export const get: RequestHandler = async (req, res) => {
  const { id } = parseOrThrow(attendanceIdSchema, req.params);
  sendSuccess(res, "Attendance record retrieved successfully", await getAttendance(id));
};
export const checkInHandler: RequestHandler = async (req, res) => {
  const input = parseOrThrow(checkInSchema, req.body);
  sendSuccess(res, "Checked in successfully", await checkIn(input), 201);
};
export const checkOutHandler: RequestHandler = async (req, res) => {
  const input = parseOrThrow(checkOutSchema, req.body);
  sendSuccess(res, "Checked out successfully", await checkOut(input));
};
