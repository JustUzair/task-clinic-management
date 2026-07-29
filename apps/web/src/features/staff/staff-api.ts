import { apiRequest } from "../../lib/api";
import type { StaffDashboard } from "./types";

export async function loadStaffDashboard(): Promise<StaffDashboard> {
  const response = await apiRequest<{ data: StaffDashboard }>(
    "/api/v1/staff/shifts",
  );
  return response.data;
}

export function claimShift(shiftId: string) {
  return apiRequest(`/api/v1/shifts/${shiftId}/claims`, {
    method: "POST",
  });
}

export function unclaimAssignment(assignmentId: string) {
  return apiRequest(`/api/v1/assignments/${assignmentId}`, {
    method: "DELETE",
  });
}
