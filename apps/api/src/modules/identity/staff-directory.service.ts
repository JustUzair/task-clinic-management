import type { PrismaClient } from "../../generated/prisma/client.js";

export class StaffDirectoryService {
  constructor(private readonly database: PrismaClient) {}

  list() {
    return this.database.staffProfile.findMany({
      include: {
        account: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        { profession: "asc" },
        { account: { fullName: "asc" } },
        { id: "asc" },
      ],
    });
  }
}
