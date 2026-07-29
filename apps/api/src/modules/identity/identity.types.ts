import type { AccountRole, Profession } from "../../generated/prisma/enums.js";

export interface AuthenticatedAccount {
  id: string;
  email: string;
  fullName: string;
  role: AccountRole;
  staffProfile: {
    id: string;
    staffId: string;
    profession: Profession;
  } | null;
}

export interface AccountRepository {
  findByEmail(email: string): Promise<AuthenticatedAccount | null>;
  findById(id: string): Promise<AuthenticatedAccount | null>;
}
