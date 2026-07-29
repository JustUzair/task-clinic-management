"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import {
  archiveShift,
  assignStaff,
  cancelShift,
  loadManagerData,
  saveShift,
  uploadCsv,
  unassignStaff,
} from "./manager-api";
import {
  emptyShiftForm,
  type CoverageShift,
  type CoverageWeek,
  type ImportBatch,
  type ShiftFormState,
  type StaffProfile,
} from "./types";

function clinicToday(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

export function useManagerDashboard() {
  const router = useRouter();
  const [week, setWeek] = useState(clinicToday());
  const [coverage, setCoverage] = useState<CoverageWeek | null>(null);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [assignmentChoice, setAssignmentChoice] = useState<
    Record<string, string>
  >({});
  const [form, setForm] = useState<ShiftFormState>(emptyShiftForm);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await loadManagerData(week);
      setCoverage(data.coverage);
      setImports(data.imports);
      setStaff(data.staff);
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        router.replace("/");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load manager data",
      );
    }
  }, [router, week]);

  useEffect(() => {
    void load();
    const invalidate = () => void load();
    window.addEventListener("clinic:invalidate", invalidate);
    return () => window.removeEventListener("clinic:invalidate", invalidate);
  }, [load]);

  const runAndReload = useCallback(
    async (operation: () => Promise<unknown>) => {
      try {
        await operation();
        await load();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "The operation failed",
        );
      }
    },
    [load],
  );

  return {
    archive: (shiftId: string) =>
      runAndReload(() => archiveShift(shiftId)),
    assign: (shiftId: string) => {
      const staffProfileId = assignmentChoice[shiftId];
      return staffProfileId
        ? runAndReload(() => assignStaff(shiftId, staffProfileId))
        : Promise.resolve();
    },
    assignmentChoice,
    cancel: (shiftId: string) => runAndReload(() => cancelShift(shiftId)),
    coverage,
    editingShiftId,
    edit: (shift: CoverageShift) => {
      setEditingShiftId(shift.id);
      setForm({
        date: shift.localTime.date,
        doctor: shift.roles.doctor.required,
        endTime: shift.localTime.endTime,
        nurse: shift.roles.nurse.required,
        receptionist: shift.roles.receptionist.required,
        startTime: shift.localTime.startTime,
      });
    },
    error,
    form,
    imports,
    save: () =>
      runAndReload(async () => {
        await saveShift(form, editingShiftId);
        setEditingShiftId(null);
        setForm(emptyShiftForm);
      }),
    setAssignment: (shiftId: string, staffProfileId: string) =>
      setAssignmentChoice(previous => ({
        ...previous,
        [shiftId]: staffProfileId,
      })),
    setForm,
    setWeek,
    staff,
    upload: (type: "staff" | "shifts", file: File) =>
      runAndReload(() => uploadCsv(type, file)),
    unassign: (assignmentId: string) =>
      runAndReload(() => unassignStaff(assignmentId)),
    week,
  };
}
