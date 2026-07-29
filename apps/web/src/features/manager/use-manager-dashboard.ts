"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const initialLoad = useRef(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true);
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
    } finally {
      initial ? setLoading(false) : setRefreshing(false);
    }
  }, [router, week]);

  useEffect(() => {
    const isInitial = initialLoad.current;
    initialLoad.current = false;
    void load(isInitial);
    const invalidate = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void load(), 75);
    };
    window.addEventListener("clinic:invalidate", invalidate);
    return () => {
      window.removeEventListener("clinic:invalidate", invalidate);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [load]);

  const runAndReload = useCallback(
    async (action: string, operation: () => Promise<unknown>) => {
      setPendingAction(action);
      setError("");
      try {
        await operation();
        await load();
        return true;
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "The operation failed",
        );
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [load],
  );

  return {
    archive: (shiftId: string) =>
      runAndReload(`archive:${shiftId}`, () => archiveShift(shiftId)),
    assign: async (shiftId: string) => {
      const staffProfileId = assignmentChoice[shiftId];
      if (!staffProfileId) return false;
      const assigned = await runAndReload(`assign:${shiftId}`, () =>
        assignStaff(shiftId, staffProfileId),
      );
      if (assigned) {
        setAssignmentChoice(previous => ({ ...previous, [shiftId]: "" }));
      }
      return assigned;
    },
    assignmentChoice,
    cancel: (shiftId: string) =>
      runAndReload(`cancel:${shiftId}`, () => cancelShift(shiftId)),
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
    loading,
    pendingAction,
    refreshing,
    save: () =>
      runAndReload("save-shift", async () => {
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
      runAndReload(`upload:${type}`, () => uploadCsv(type, file)),
    unassign: (assignmentId: string) =>
      runAndReload(`unassign:${assignmentId}`, () =>
        unassignStaff(assignmentId),
      ),
    week,
  };
}
