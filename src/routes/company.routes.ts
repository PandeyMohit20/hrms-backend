import { Router } from "express";
import * as controller from "../controllers/company.controller.js";

export const companyRouter = Router();
companyRouter.get("/", controller.list);
companyRouter.get("/:id", controller.get);
companyRouter.post("/", controller.create);
