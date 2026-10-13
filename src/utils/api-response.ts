import type { Response } from "express";

export function sendSuccess<T>(res: Response, message: string, data: T, status = 200): void {
  res.status(status).json({ success: true, message, data });
}

export function sendPaginated<T>(res: Response, message: string, data: T[], page: number, limit: number, total: number): void {
  sendSuccess(res, message, {
    items: data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly errors: unknown[] = []) {
    super(message);
    this.name = "HttpError";
  }
}
