import type { RequestHandler } from "express";
import { createCompany, getCompany, listCompanies } from "../services/company.service.js";
import { companyCreateSchema, companyIdSchema, companyListSchema } from "../validators/company.validator.js";
import { parseOrThrow } from "../validators/common.validator.js";
import { sendPaginated, sendSuccess } from "../utils/api-response.js";

export const list: RequestHandler = async (req, res) => {
  const { page, limit } = parseOrThrow(companyListSchema, req.query);
  const result = await listCompanies(page, limit);
  sendPaginated(res, "Companies retrieved successfully", result.items, page, limit, result.total);
};
export const get: RequestHandler = async (req, res) => {
  const { id } = parseOrThrow(companyIdSchema, req.params);
  sendSuccess(res, "Company retrieved successfully", await getCompany(id));
};
export const create: RequestHandler = async (req, res) => {
  const input = parseOrThrow(companyCreateSchema, req.body);
  sendSuccess(res, "Company created successfully", await createCompany(input), 201);
};
