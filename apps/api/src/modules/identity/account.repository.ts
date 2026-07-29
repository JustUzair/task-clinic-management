import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  AccountRepository,
  AuthenticatedAccount,
} from "./identity.types.js";

const accountSelection = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  staffProfile: {
    select: {
      id: true,
      profession: true,
      staffId: true,
    },
  },
} as const;

export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly database: PrismaClient) {}

  async findByEmail(email: string): Promise<AuthenticatedAccount | null> {
    return this.database.account.findUnique({
      where: { email },
      select: accountSelection,
    });
  }

  async findById(id: string): Promise<AuthenticatedAccount | null> {
    return this.database.account.findUnique({
      where: { id },
      select: accountSelection,
    });
  }
}
