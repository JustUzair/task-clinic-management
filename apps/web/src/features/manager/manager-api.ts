import { apiRequest } from "../../lib/api";
import type {
  CoverageWeek,
  ImportBatch,
  ImportReport,
  ShiftFormState,
  StaffProfile,
} from "./types";

export async function loadManagerData(week: string) {
  const [coverageResponse, importResponse, staffResponse] = await Promise.all([
    apiRequest<{ data: CoverageWeek }>(`/api/v1/coverage?week=${week}`),
    apiRequest<{ data: { imports: ImportBatch[] } }>("/api/v1/imports"),
    apiRequest<{ data: { staff: StaffProfile[] } }>(
      "/api/v1/staff-directory",
    ),
  ]);

  return {
    coverage: coverageResponse.data,
    imports: importResponse.data.imports,
    staff: staffResponse.data.staff,
  };
}

export async function loadImportReport(batchId: string) {
  const response = await apiRequest<{ data: { import: ImportReport } }>(
    `/api/v1/imports/${batchId}`,
  );
  return response.data.import;
}

export async function saveShift(
  form: ShiftFormState,
  editingShiftId: string | null,
) {
  return apiRequest(
    editingShiftId ? `/api/v1/shifts/${editingShiftId}` : "/api/v1/shifts",
    {
      body: JSON.stringify({
        date: form.date,
        endTime: form.endTime,
        requirements: {
          doctor: Number(form.doctor),
          nurse: Number(form.nurse),
          receptionist: Number(form.receptionist),
        },
        startTime: form.startTime,
      }),
      method: editingShiftId ? "PATCH" : "POST",
    },
  );
}

export async function uploadCsv(
  type: "staff" | "shifts",
  file: File,
) {
  const body = new FormData();
  body.set("file", file);
  return apiRequest(`/api/v1/imports/${type}`, { body, method: "POST" });
}

export function assignStaff(shiftId: string, staffProfileId: string) {
  return apiRequest(`/api/v1/shifts/${shiftId}/assignments`, {
    body: JSON.stringify({ staffProfileId }),
    method: "POST",
  });
}

export function unassignStaff(assignmentId: string) {
  return apiRequest(`/api/v1/assignments/${assignmentId}`, {
    method: "DELETE",
  });
}

export function cancelShift(shiftId: string) {
  return apiRequest(`/api/v1/shifts/${shiftId}/cancel`, {
    method: "POST",
  });
}

export function archiveShift(shiftId: string) {
  return apiRequest(`/api/v1/shifts/${shiftId}`, { method: "DELETE" });
}
