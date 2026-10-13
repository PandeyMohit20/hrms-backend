import { Router } from "express";
import * as controller from "../controllers/attendance.controller.js";

export const attendanceRouter = Router();
attendanceRouter.get("/", controller.list);
attendanceRouter.get("/:id", controller.get);
attendanceRouter.post("/check-in", controller.checkInHandler);
attendanceRouter.post("/check-out", controller.checkOutHandler);
