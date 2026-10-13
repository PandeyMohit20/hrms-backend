import { Router } from "express";
import * as controller from "../controllers/branch.controller.js";

export const branchRouter = Router();
branchRouter.get("/", controller.list);
branchRouter.get("/:id", controller.get);
branchRouter.post("/", controller.create);
