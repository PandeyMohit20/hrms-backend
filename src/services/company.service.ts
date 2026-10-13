import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/api-response.js";

export async function listCompanies(page: number, limit: number) {
  const [items, total] = await prisma.$transaction([
    prisma.company.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }),
    prisma.company.count(),
  ]);
  return { items, total };
}

export async function getCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new HttpError(404, "Company not found");
  return company;
}

export async function createCompany(input: Prisma.CompanyCreateInput) {
  return prisma.company.create({ data: input });
}
