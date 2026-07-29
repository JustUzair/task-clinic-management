import { Router } from "express";
import { getStatus } from "../controllers/status.controller.js";

export const statusRouter = Router();

statusRouter.get("/", getStatus);
