export interface RoleCoverage {
  claimed: number;
  missing: number;
  required: number;
}

export interface CoverageShift {
  assignments: Array<{
    id: string;
    origin: "MANAGER_ASSIGNED" | "SELF_CLAIMED";
    staffProfile: StaffProfile;
  }>;
  id: string;
  localTime: {
    date: string;
    endTime: string;
    overnight: boolean;
    startTime: string;
  };
  coverageStatus: "empty" | "partial" | "full";
  endsAt: string;
  roles: Record<"doctor" | "nurse" | "receptionist", RoleCoverage>;
  startsAt: string;
}

export interface CoverageWeek {
  shifts: CoverageShift[];
  weekEnd: string;
  weekStart: string;
}

export interface ImportBatch {
  acceptedRows: number;
  id: string;
  mergedRows: number;
  rejectedRows: number;
  sourceFilename: string;
  status: string;
  type: string;
}

export interface ImportEvidenceRow {
  action: string;
  explanation: string;
  id: string;
  linkedEntity: string | null;
  linkedRecordId: string | null;
  normalizedData: unknown;
  rawData: unknown;
  reasonCode: string | null;
  sourceRowNumber: number;
  status: "MERGED" | "REJECTED";
}

export interface ImportReport extends ImportBatch {
  rows: ImportEvidenceRow[];
}

export interface StaffProfile {
  id: string;
  profession: string;
  staffId: string;
  account: {
    fullName: string;
  };
}

export interface ShiftFormState {
  date: string;
  doctor: number;
  endTime: string;
  nurse: number;
  receptionist: number;
  startTime: string;
}

export const emptyShiftForm: ShiftFormState = {
  date: "",
  doctor: 0,
  endTime: "17:00",
  nurse: 1,
  receptionist: 0,
  startTime: "09:00",
};
