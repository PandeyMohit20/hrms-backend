import type { RequestHandler } from "express";
import { createBranch, getBranch, listBranches } from "../services/branch.service.js";
import { branchCreateSchema, branchIdSchema, branchListSchema } from "../validators/branch.validator.js";
import { parseOrThrow } from "../validators/common.validator.js";
import { sendPaginated, sendSuccess } from "../utils/api-response.js";

export const list: RequestHandler = async (req, res) => {
  const args = parseOrThrow(branchListSchema, req.query);
  const result = await listBranches(args);
  sendPaginated(res, "Branches retrieved successfully", result.items, args.page, args.limit, result.total);
};
export const get: RequestHandler = async (req, res) => {
  const { id } = parseOrThrow(branchIdSchema, req.params);
  sendSuccess(res, "Branch retrieved successfully", await getBranch(id));
};
export const create: RequestHandler = async (req, res) => {
  const input = parseOrThrow(branchCreateSchema, req.body);
  sendSuccess(res, "Branch created successfully", await createBranch(input), 201);
};
