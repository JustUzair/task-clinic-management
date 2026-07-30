"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { CalendarDays } from "lucide-react";
import type {
  CoverageShift,
  CoverageWeek,
  StaffProfile,
} from "../../features/manager/types";
import { LoadingIndicator } from "../loading-indicator";
import { CoverageShiftCard } from "./coverage-shift-card";

export function CoveragePanel({
  assignmentChoice,
  busy,
  coverage,
  onArchive,
  onAssign,
  onCancel,
  onEdit,
  onSelectStaff,
  onUnassign,
  onWeekChange,
  pendingAction,
  staff,
  week,
}: {
  assignmentChoice: Record<string, string>;
  busy: boolean;
  coverage: CoverageWeek | null;
  onArchive: (shiftId: string) => Promise<unknown>;
  onAssign: (shiftId: string) => Promise<unknown>;
  onCancel: (shiftId: string) => Promise<unknown>;
  onEdit: (shift: CoverageShift) => void;
  onSelectStaff: (shiftId: string, staffProfileId: string) => void;
  onUnassign: (assignmentId: string) => Promise<unknown>;
  onWeekChange: (week: string) => void;
  pendingAction: string | null;
  staff: StaffProfile[];
  week: string;
}) {
  const moveWeek = (days: number) => {
    const date = new Date(`${week}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    onWeekChange(date.toISOString().slice(0, 10));
  };

  return (
    <Stack spacing={2}>
      <Paper
        sx={{ border: "1px solid", borderColor: "divider", p: 2.5 }}
        variant="outlined"
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: { sm: "flex-end" },
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  alignItems: "center",
                  backgroundColor: "primary.light",
                  borderRadius: 3,
                  color: "primary.dark",
                  display: "flex",
                  height: 42,
                  justifyContent: "center",
                  width: 42,
                }}
              >
                <CalendarDays size={18} />
              </Box>
              <div>
                <Typography component="h2" variant="h6">
                  Weekly coverage
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {coverage
                    ? `${coverage.weekStart} to ${coverage.weekEnd}`
                    : "Loading…"}
                </Typography>
              </div>
            </Stack>
            {busy ? (
              <Box sx={{ mt: 1.5 }}>
                <LoadingIndicator label="Updating coverage…" />
              </Box>
            ) : null}
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <ButtonGroup aria-label="Week navigation" variant="outlined">
              <Button disabled={busy} onClick={() => moveWeek(-7)}>
                Previous week
              </Button>
              <Button disabled={busy} onClick={() => moveWeek(7)}>
                Next week
              </Button>
            </ButtonGroup>
            <TextField
              aria-label="Jump to week containing date"
              disabled={busy}
              onChange={event => onWeekChange(event.target.value)}
              size="small"
              type="date"
              value={week}
            />
          </Stack>
        </Stack>
      </Paper>

      {coverage?.shifts.map(shift => (
        <CoverageShiftCard
          assignmentChoice={assignmentChoice[shift.id] ?? ""}
          busy={busy}
          key={shift.id}
          onArchive={onArchive}
          onAssign={onAssign}
          onCancel={onCancel}
          onEdit={onEdit}
          onSelectStaff={onSelectStaff}
          onUnassign={onUnassign}
          pendingAction={pendingAction}
          shift={shift}
          staff={staff}
        />
      ))}
      {coverage?.shifts.length === 0 ? (
        <Alert severity="info">No active shifts start in this week.</Alert>
      ) : null}
    </Stack>
  );
}
