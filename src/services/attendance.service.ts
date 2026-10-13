import { AttendanceSource, AttendanceStatus, EmployeeStatus, Prisma } from "@prisma/client";
import { config } from "../config/env.js";
import { getPrismaClient } from "../lib/prisma.js";
import { HttpError } from "../utils/api-response.js";

const attendanceInclude = {
  employee: {
    select: {
      id: true, employeeCode: true, firstName: true, lastName: true,
      company: { select: { id: true, name: true, code: true } },
      branch: { select: { id: true, name: true, code: true } },
    },
  },
} satisfies Prisma.AttendanceRecordInclude;

function dateInConfiguredTimezone(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.ATTENDANCE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const year = part("year"); const month = part("month"); const day = part("day");
  if (!year || !month || !day) throw new Error("Could not determine local attendance date");
  return `${year}-${month}-${day}`;
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function listAttendance(args: {
  page: number; limit: number; employeeId?: string | undefined; attendanceDate?: string | undefined; fromDate?: string | undefined;
  toDate?: string | undefined; status?: AttendanceStatus | undefined; companyId?: string | undefined; branchId?: string | undefined;
}) {
  const where: Prisma.AttendanceRecordWhereInput = {
    ...(args.employeeId ? { employeeId: args.employeeId } : {}),
    ...(args.attendanceDate ? { attendanceDate: dateOnly(args.attendanceDate) } : {}),
    ...(args.fromDate || args.toDate ? { attendanceDate: {
      ...(args.fromDate ? { gte: dateOnly(args.fromDate) } : {}),
      ...(args.toDate ? { lte: dateOnly(args.toDate) } : {}),
    } } : {}),
    ...(args.status ? { status: args.status } : {}),
    ...(args.companyId || args.branchId ? { employee: {
      ...(args.companyId ? { companyId: args.companyId } : {}),
      ...(args.branchId ? { branchId: args.branchId } : {}),
    } } : {}),
  };
  const client = getPrismaClient();
  const [items, total] = await client.$transaction([
    client.attendanceRecord.findMany({ where, include: attendanceInclude, skip: (args.page - 1) * args.limit, take: args.limit, orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }] }),
    client.attendanceRecord.count({ where }),
  ]);
  return { items, total };
}

export async function getAttendance(id: string) {
  const record = await getPrismaClient().attendanceRecord.findUnique({ where: { id }, include: attendanceInclude });
  if (!record) throw new HttpError(404, "Attendance record not found");
  return record;
}

export type Coordinates = { latitude?: number | undefined; longitude?: number | undefined };

function coordinateData(point: Coordinates, prefix: "checkIn" | "checkOut") {
  return {
    ...(point.latitude !== undefined ? { [`${prefix}Latitude`]: point.latitude } : {}),
    ...(point.longitude !== undefined ? { [`${prefix}Longitude`]: point.longitude } : {}),
  };
}

export async function checkIn(input: Coordinates & { employeeId: string; source: AttendanceSource }) {
  const client = getPrismaClient();
  const employee = await client.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, status: true } });
  if (!employee) throw new HttpError(404, "Employee not found");
  if (employee.status !== EmployeeStatus.ACTIVE) throw new HttpError(409, "Only active employees can check in");
  const now = new Date();
  const attendanceDate = dateOnly(dateInConfiguredTimezone(now));
  try {
    return await client.attendanceRecord.create({
      data: {
        employee: { connect: { id: input.employeeId } }, attendanceDate, checkIn: now,
        status: AttendanceStatus.PRESENT, source: input.source,
        ...coordinateData(input, "checkIn"),
      },
      include: attendanceInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Attendance has already been recorded for this employee today");
    }
    throw error;
  }
}

export async function checkOut(input: Coordinates & { employeeId: string }) {
  const client = getPrismaClient();
  const attendanceDate = dateOnly(dateInConfiguredTimezone(new Date()));
  const record = await client.attendanceRecord.findUnique({ where: { employeeId_attendanceDate: { employeeId: input.employeeId, attendanceDate } } });
  if (!record) throw new HttpError(409, "No check-in record exists for this employee today");
  if (!record.checkIn) throw new HttpError(409, "This attendance record has no check-in time");
  if (record.checkOut) throw new HttpError(409, "This employee has already checked out today");
  const checkOutAt = new Date();
  const elapsedMinutes = Math.floor((checkOutAt.getTime() - record.checkIn.getTime()) / 60_000);
  if (elapsedMinutes < 0) throw new HttpError(409, "Check-out time cannot be earlier than check-in time");
  const update = await client.attendanceRecord.updateMany({
    where: { id: record.id, checkOut: null, checkIn: { lte: checkOutAt } },
    data: { checkOut: checkOutAt, totalMinutes: elapsedMinutes, ...coordinateData(input, "checkOut") },
  });
  if (update.count !== 1) throw new HttpError(409, "This employee has already checked out or the attendance record changed");
  return client.attendanceRecord.findUniqueOrThrow({ where: { id: record.id }, include: attendanceInclude });
}
