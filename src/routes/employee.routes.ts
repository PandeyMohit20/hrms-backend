import { Router } from "express";
import * as controller from "../controllers/employee.controller.js";

export const employeeRouter = Router();
employeeRouter.get("/", controller.list);
employeeRouter.get("/:id", controller.get);
employeeRouter.post("/", controller.create);
