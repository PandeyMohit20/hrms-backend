import type { RequestHandler } from "express";
import { createEmployee, getEmployee, listEmployees } from "../services/employee.service.js";
import { employeeCreateSchema, employeeIdSchema, employeeListSchema } from "../validators/employee.validator.js";
import { parseOrThrow } from "../validators/common.validator.js";
import { sendPaginated, sendSuccess } from "../utils/api-response.js";

export const list: RequestHandler = async (req, res) => {
  const args = parseOrThrow(employeeListSchema, req.query);
  const result = await listEmployees(args);
  sendPaginated(res, "Employees retrieved successfully", result.items, args.page, args.limit, result.total);
};
export const get: RequestHandler = async (req, res) => {
  const { id } = parseOrThrow(employeeIdSchema, req.params);
  sendSuccess(res, "Employee retrieved successfully", await getEmployee(id));
};
export const create: RequestHandler = async (req, res) => {
  const input = parseOrThrow(employeeCreateSchema, req.body);
  sendSuccess(res, "Employee created successfully", await createEmployee(input), 201);
};
