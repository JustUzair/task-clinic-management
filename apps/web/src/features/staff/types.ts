export type AssignmentOrigin = "MANAGER_ASSIGNED" | "SELF_CLAIMED";
export type AssignmentStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "UNASSIGNED"
  | "UNCLAIMED";

export interface LocalShiftTime {
  date: string;
  endTime: string;
  overnight: boolean;
  startTime: string;
}

export interface PresentedShift {
  endsAt: string;
  id: string;
  localTime: LocalShiftTime;
  startsAt: string;
  status: string;
}

export interface AvailableShift {
  claimed: number;
  disabledReason: string | null;
  remaining: number;
  required: number;
  shift: PresentedShift;
}

export interface PersonalAssignment {
  id: string;
  origin: AssignmentOrigin;
  shift: PresentedShift;
  status: AssignmentStatus;
}

export interface StaffDashboard {
  available: AvailableShift[];
  availablePagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  cancelled: PersonalAssignment[];
  completed: PersonalAssignment[];
  ongoing: PersonalAssignment[];
  upcoming: PersonalAssignment[];
}
