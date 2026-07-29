import type { RequestHandler } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import type { StaffDirectoryService } from "./staff-directory.service.js";

export class StaffDirectoryController {
  readonly list: RequestHandler;

  constructor(private readonly directory: StaffDirectoryService) {
    this.list = asyncHandler(async (_request, response) => {
      const staff = await this.directory.list();
      response.status(200).json({ data: { staff } });
    });
  }
}
