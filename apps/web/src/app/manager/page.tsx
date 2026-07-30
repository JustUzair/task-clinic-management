"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  CalendarClock,
  CalendarPlus2,
  ClipboardList,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardShell } from "../../components/dashboard-shell";
import { LoadingIndicator } from "../../components/loading-indicator";
import { CoveragePanel } from "../../components/manager/coverage-panel";
import { ImportPanel } from "../../components/manager/import-panel";
import { ShiftForm } from "../../components/manager/shift-form";
import { useManagerDashboard } from "../../features/manager/use-manager-dashboard";

export default function ManagerPage() {
  const manager = useManagerDashboard();
  const busy = manager.refreshing || manager.pendingAction !== null;
  const coverage = manager.coverage;
  const shifts = coverage?.shifts ?? [];
  const importedRows = manager.imports.reduce(
    (total, batch) => total + batch.acceptedRows + batch.mergedRows,
    0,
  );
  const stats = [
    {
      icon: CalendarClock,
      label: "Shifts this week",
      tone: "#147d74",
      value: shifts.length,
    },
    {
      icon: ShieldCheck,
      label: "Fully staffed",
      tone: "#1f8f63",
      value: shifts.filter(shift => shift.coverageStatus === "full").length,
    },
    {
      icon: Users,
      label: "Open gaps",
      tone: "#d97706",
      value: shifts.reduce(
        (total, shift) =>
          total +
          Object.values(shift.roles).reduce(
            (roleTotal, role) => roleTotal + role.missing,
            0,
          ),
        0,
      ),
    },
    {
      icon: ClipboardList,
      label: "Imported rows",
      tone: "#23414d",
      value: importedRows,
    },
  ];

  return (
    <DashboardShell title="Manager dashboard">
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: { sm: "flex-end" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h4">Shift operations</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Plan the week, fill open coverage, and keep import evidence within
              reach.
            </Typography>
          </Box>
          <Button
            disabled={busy}
            onClick={manager.startCreate}
            startIcon={<CalendarPlus2 size={18} />}
            variant="contained"
          >
            Create shift
          </Button>
        </Stack>

        {manager.error ? <Alert severity="error">{manager.error}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
            }}
          >
            {stats.map(item => (
              <Card key={item.label} variant="outlined">
                <CardContent
                  sx={{ alignItems: "center", display: "flex", gap: 2.25 }}
                >
                  <Box
                    sx={{
                      alignItems: "center",
                      backgroundColor: `${item.tone}14`,
                      borderRadius: 4,
                      color: item.tone,
                      display: "flex",
                      height: 52,
                      justifyContent: "center",
                      width: 52,
                    }}
                  >
                    <item.icon size={22} />
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }} variant="h5">
                      {item.value}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

        {manager.loading && !manager.coverage ? (
          <LoadingIndicator label="Loading manager dashboard…" page />
        ) : (
          <>
            <Box
              component="section"
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: "minmax(0, 1fr)",
              }}
            >
              <CoveragePanel
                assignmentChoice={manager.assignmentChoice}
                busy={busy}
                coverage={manager.coverage}
                onArchive={manager.archive}
                onAssign={manager.assign}
                onCancel={manager.cancel}
                onEdit={manager.edit}
                onSelectStaff={manager.setAssignment}
                onUnassign={manager.unassign}
                onWeekChange={manager.setWeek}
                pendingAction={manager.pendingAction}
                staff={manager.staff}
                week={manager.week}
              />
              <ShiftForm
                busy={busy}
                editing={Boolean(manager.editingShiftId)}
                form={manager.form}
                onClose={manager.closeForm}
                onChange={manager.setForm}
                onSave={manager.save}
                open={manager.formOpen}
                saving={manager.pendingAction === "save-shift"}
              />
            </Box>

            <ImportPanel
              busy={busy}
              feedback={manager.importFeedback}
              imports={manager.imports}
              onDismissFeedback={manager.clearImportFeedback}
              onUpload={manager.upload}
              pendingAction={manager.pendingAction}
            />
          </>
        )}
      </Stack>
    </DashboardShell>
  );
}
