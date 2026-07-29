import type { Request, Response } from "express";
import { getApiStatus } from "../models/status.model.js";

export function getStatus(_request: Request, response: Response): void {
  response.status(200).json(getApiStatus());
}
