import { apiRequest } from "../../lib/api";
import type { StaffDashboard } from "./types";

export async function loadStaffDashboard(
  availablePage = 1,
): Promise<StaffDashboard> {
  const query = new URLSearchParams({
    availablePage: String(availablePage),
    availablePageSize: "20",
    historyLimit: "50",
  });
  const response = await apiRequest<{ data: StaffDashboard }>(
    `/api/v1/staff/shifts?${query.toString()}`,
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
