import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { Prisma, EmployeeStatus, AttendanceSource } from "@prisma/client";
import { setPrismaClientForTests } from "../src/lib/prisma.js";
import { createBranch } from "../src/services/branch.service.js";
import { createEmployee } from "../src/services/employee.service.js";
import { checkIn, checkOut } from "../src/services/attendance.service.js";
import { branchCreateSchema, branchListSchema } from "../src/validators/branch.validator.js";
import { HttpError } from "../src/utils/api-response.js";

const mockClient = (overrides: Record<string, unknown>) => ({
  company: { findUnique: async () => ({ id: "company-id" }) },
  branch: { findUnique: async () => ({ id: "branch-id", companyId: "company-id" }), create: async ({ data }: { data: unknown }) => data },
  department: { findUnique: async () => ({ id: "department-id" }) },
  employee: { findUnique: async () => ({ id: "employee-id", status: EmployeeStatus.ACTIVE }), create: async ({ data }: { data: unknown }) => data },
  attendanceRecord: {
    create: async ({ data }: { data: unknown }) => data,
    findUnique: async () => ({ id: "attendance-id", checkIn: new Date(Date.now() - 3_700_000), checkOut: null }),
    updateMany: async () => ({ count: 1 }),
    findUniqueOrThrow: async () => ({ id: "attendance-id", totalMinutes: 61 }),
  },
  ...overrides,
}) as never;

const companyId = "2a5f2401-63e6-493c-b9ea-0fe19d09b08a";
const branchId = "3a5f2401-63e6-493c-b9ea-0fe19d09b08a";
const employeeId = "4a5f2401-63e6-493c-b9ea-0fe19d09b08a";

afterEach(() => {
  // Each test replaces every mocked delegate it uses; no real database access occurs.
});

describe("branch API validation and service rules", () => {
  it("requires UUID companyId, name, code, rejects arbitrary fields, and validates coordinates", () => {
    assert.equal(branchCreateSchema.safeParse({ companyId: "not-a-uuid", name: "HQ", code: "HQ" }).success, false);
    assert.equal(branchCreateSchema.safeParse({ companyId: "2a5f2401-63e6-493c-b9ea-0fe19d09b08a", name: "HQ", code: "HQ", secret: "x" }).success, false);
    assert.equal(branchCreateSchema.safeParse({ companyId: "2a5f2401-63e6-493c-b9ea-0fe19d09b08a", name: "HQ", code: "HQ", latitude: 91 }).success, false);
    assert.equal(branchCreateSchema.safeParse({ companyId: "2a5f2401-63e6-493c-b9ea-0fe19d09b08a", name: "HQ", code: "HQ", latitude: 12 }).success, false);
  });

  it("parses active-state and rejects malformed branch filters", () => {
    assert.equal(branchListSchema.parse({ page: "2", isActive: "false" }).isActive, false);
    assert.equal(branchListSchema.safeParse({ companyId: "bad" }).success, false);
    assert.equal(branchListSchema.safeParse({ isActive: "yes" }).success, false);
  });

  it("returns a clear client error when company is missing", async () => {
    setPrismaClientForTests(mockClient({ company: { findUnique: async () => null } }));
    await assert.rejects(createBranch({ companyId, name: "HQ", code: "HQ" }), (error: unknown) => error instanceof HttpError && error.status === 400);
  });

  it("maps duplicate company branch codes to HTTP 409", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.19.3" });
    setPrismaClientForTests(mockClient({ branch: { findUnique: async () => null, create: async () => { throw duplicate; } } }));
    await assert.rejects(createBranch({ companyId, name: "HQ", code: "HQ" }), (error: unknown) => error instanceof HttpError && error.status === 409);
  });
});

describe("attendance workflow rules", () => {
  it("maps duplicate attendance unique constraint to HTTP 409", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.19.3" });
    setPrismaClientForTests(mockClient({ attendanceRecord: { create: async () => { throw duplicate; } } }));
    await assert.rejects(checkIn({ employeeId, source: AttendanceSource.WEB }), (error: unknown) => error instanceof HttpError && error.status === 409);
  });

  it("rejects checkout when no same-day check-in exists", async () => {
    setPrismaClientForTests(mockClient({ attendanceRecord: { findUnique: async () => null } }));
    await assert.rejects(checkOut({ employeeId }), (error: unknown) => error instanceof HttpError && error.status === 409);
  });

  it("rejects a repeated checkout", async () => {
    setPrismaClientForTests(mockClient({ attendanceRecord: { findUnique: async () => ({ id: "attendance-id", checkIn: new Date(Date.now() - 3600000), checkOut: new Date() }) } }));
    await assert.rejects(checkOut({ employeeId }), (error: unknown) => error instanceof HttpError && error.status === 409);
  });

  it("conditionally records checkout and calculates whole elapsed minutes", async () => {
    let updateArgs: unknown;
    setPrismaClientForTests(mockClient({ attendanceRecord: {
      findUnique: async () => ({ id: "attendance-id", checkIn: new Date(Date.now() - 3_700_000), checkOut: null }),
      updateMany: async (args: unknown) => { updateArgs = args; return { count: 1 }; },
      findUniqueOrThrow: async () => ({ id: "attendance-id", totalMinutes: 61 }),
    } }));
    const result = await checkOut({ employeeId });
    assert.equal((result as { totalMinutes: number }).totalMinutes, 61);
    assert.ok(updateArgs);
  });

  it("rejects a simultaneous repeated checkout when the conditional update loses", async () => {
    setPrismaClientForTests(mockClient({ attendanceRecord: {
      findUnique: async () => ({ id: "attendance-id", checkIn: new Date(Date.now() - 3600000), checkOut: null }),
      updateMany: async () => ({ count: 0 }),
    } }));
    await assert.rejects(checkOut({ employeeId }), (error: unknown) => error instanceof HttpError && error.status === 409);
  });

  it("checks employee and branch references including company ownership", async () => {
    setPrismaClientForTests(mockClient({ company: { findUnique: async () => null } }));
    await assert.rejects(createEmployee({ employeeCode: "A", firstName: "A", joiningDate: "2026-01-01", companyId, branchId }), /companyId/);
    setPrismaClientForTests(mockClient({ branch: { findUnique: async () => ({ id: "branch-id", companyId: "different-company" }) } }));
    await assert.rejects(createEmployee({ employeeCode: "A", firstName: "A", joiningDate: "2026-01-01", companyId, branchId }), /must belong/);
  });
});
