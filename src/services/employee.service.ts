import { EmployeeStatus, Prisma } from "@prisma/client";
import { getPrismaClient } from "../lib/prisma.js";
import { HttpError } from "../utils/api-response.js";

const employeeInclude = {
  company: { select: { id: true, name: true, code: true } },
  branch: { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeInclude;

export async function listEmployees(args: {
  page: number; limit: number; search?: string | undefined; companyId?: string | undefined; branchId?: string | undefined;
  departmentId?: string | undefined; status?: EmployeeStatus | undefined;
}) {
  const where: Prisma.EmployeeWhereInput = {
    ...(args.companyId ? { companyId: args.companyId } : {}),
    ...(args.branchId ? { branchId: args.branchId } : {}),
    ...(args.departmentId ? { departmentId: args.departmentId } : {}),
    ...(args.status ? { status: args.status } : {}),
    ...(args.search ? { OR: [
      { employeeCode: { contains: args.search, mode: "insensitive" } },
      { firstName: { contains: args.search, mode: "insensitive" } },
      { lastName: { contains: args.search, mode: "insensitive" } },
      { email: { contains: args.search, mode: "insensitive" } },
    ] } : {}),
  };
  const client = getPrismaClient();
  const [items, total] = await client.$transaction([
    client.employee.findMany({ where, include: employeeInclude, skip: (args.page - 1) * args.limit, take: args.limit, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    client.employee.count({ where }),
  ]);
  return { items, total };
}

export async function getEmployee(id: string) {
  const employee = await getPrismaClient().employee.findUnique({ where: { id }, include: employeeInclude });
  if (!employee) throw new HttpError(404, "Employee not found");
  return employee;
}

export type EmployeeInput = {
  employeeCode: string; firstName: string; lastName?: string | null | undefined; email?: string | null | undefined;
  phone?: string | null | undefined; joiningDate: string; status?: EmployeeStatus | undefined; companyId: string;
  branchId: string; departmentId?: string | null | undefined;
};

export async function createEmployee(input: EmployeeInput) {
  const client = getPrismaClient();
  const [company, branch, department] = await Promise.all([
    client.company.findUnique({ where: { id: input.companyId }, select: { id: true } }),
    client.branch.findUnique({ where: { id: input.branchId }, select: { id: true, companyId: true } }),
    input.departmentId ? client.department.findUnique({ where: { id: input.departmentId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!company) throw new HttpError(400, "companyId does not reference an existing company");
  if (!branch) throw new HttpError(400, "branchId does not reference an existing branch");
  if (branch.companyId !== input.companyId) throw new HttpError(400, "branchId must belong to companyId");
  if (input.departmentId && !department) throw new HttpError(400, "departmentId does not reference an existing department");

  const data: Prisma.EmployeeCreateInput = {
    employeeCode: input.employeeCode,
    firstName: input.firstName,
    joiningDate: new Date(`${input.joiningDate}T00:00:00.000Z`),
    company: { connect: { id: input.companyId } },
    branch: { connect: { id: input.branchId } },
    ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.departmentId ? { department: { connect: { id: input.departmentId } } } : {}),
  };
  return client.employee.create({ data, include: employeeInclude });
}
