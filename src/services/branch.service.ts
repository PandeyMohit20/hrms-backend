import { Prisma } from "@prisma/client";
import { getPrismaClient } from "../lib/prisma.js";
import { HttpError } from "../utils/api-response.js";

export async function listBranches(args: {
  page: number; limit: number; companyId?: string | undefined; isActive?: boolean | undefined;
}) {
  const where: Prisma.BranchWhereInput = {
    ...(args.companyId ? { companyId: args.companyId } : {}),
    ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
  };
  const client = getPrismaClient();
  const [items, total] = await client.$transaction([
    client.branch.findMany({ where, include: { company: { select: { id: true, name: true, code: true } } }, skip: (args.page - 1) * args.limit, take: args.limit, orderBy: [{ name: "asc" }] }),
    client.branch.count({ where }),
  ]);
  return { items, total };
}

export async function getBranch(id: string) {
  const branch = await getPrismaClient().branch.findUnique({ where: { id }, include: { company: { select: { id: true, name: true, code: true } } } });
  if (!branch) throw new HttpError(404, "Branch not found");
  return branch;
}

export type BranchInput = {
  companyId: string; name: string; code: string; address?: string | null | undefined;
  latitude?: number | null | undefined; longitude?: number | null | undefined;
  radiusM?: number | undefined; isActive?: boolean | undefined;
};

export async function createBranch(input: BranchInput) {
  const client = getPrismaClient();
  const company = await client.company.findUnique({ where: { id: input.companyId }, select: { id: true } });
  if (!company) throw new HttpError(400, "companyId does not reference an existing company");
  try {
    const data: Prisma.BranchCreateInput = {
      name: input.name,
      code: input.code,
      company: { connect: { id: input.companyId } },
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.radiusM !== undefined ? { radiusM: input.radiusM } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    return await client.branch.create({ data, include: { company: { select: { id: true, name: true, code: true } } } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "A branch with this code already exists for the company");
    }
    throw error;
  }
}
