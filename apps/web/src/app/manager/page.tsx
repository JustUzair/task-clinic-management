"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { DashboardShell } from "../../components/dashboard-shell";
import { CoveragePanel } from "../../components/manager/coverage-panel";
import { ImportPanel } from "../../components/manager/import-panel";
import { ShiftForm } from "../../components/manager/shift-form";
import { useManagerDashboard } from "../../features/manager/use-manager-dashboard";

export default function ManagerPage() {
  const manager = useManagerDashboard();

  return (
    <DashboardShell title="Manager dashboard">
      {manager.error ? <Alert severity="error">{manager.error}</Alert> : null}

      <Box
        component="section"
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { lg: "minmax(0, 2fr) minmax(18rem, 1fr)" },
          mt: manager.error ? 2 : 0,
        }}
      >
        <CoveragePanel
          assignmentChoice={manager.assignmentChoice}
          coverage={manager.coverage}
          onArchive={manager.archive}
          onAssign={manager.assign}
          onCancel={manager.cancel}
          onEdit={manager.edit}
          onSelectStaff={manager.setAssignment}
          onUnassign={manager.unassign}
          onWeekChange={manager.setWeek}
          staff={manager.staff}
          week={manager.week}
        />
        <ShiftForm
          editing={Boolean(manager.editingShiftId)}
          form={manager.form}
          onChange={manager.setForm}
          onSave={manager.save}
        />
      </Box>

      <ImportPanel imports={manager.imports} onUpload={manager.upload} />
    </DashboardShell>
  );
}
