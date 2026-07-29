"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
  CoverageShift,
  CoverageWeek,
  StaffProfile,
} from "../../features/manager/types";
import { CoverageShiftCard } from "./coverage-shift-card";

export function CoveragePanel({
  assignmentChoice,
  coverage,
  onArchive,
  onAssign,
  onCancel,
  onEdit,
  onSelectStaff,
  onUnassign,
  onWeekChange,
  staff,
  week,
}: {
  assignmentChoice: Record<string, string>;
  coverage: CoverageWeek | null;
  onArchive: (shiftId: string) => Promise<unknown>;
  onAssign: (shiftId: string) => Promise<unknown>;
  onCancel: (shiftId: string) => Promise<unknown>;
  onEdit: (shift: CoverageShift) => void;
  onSelectStaff: (shiftId: string, staffProfileId: string) => void;
  onUnassign: (assignmentId: string) => Promise<unknown>;
  onWeekChange: (week: string) => void;
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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          alignItems: { sm: "flex-end" },
          justifyContent: "space-between",
        }}
      >
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <ButtonGroup aria-label="Week navigation" variant="outlined">
            <Button onClick={() => moveWeek(-7)}>Previous</Button>
            <Button onClick={() => moveWeek(7)}>Next</Button>
          </ButtonGroup>
          <TextField
            aria-label="Jump to week containing date"
            onChange={event => onWeekChange(event.target.value)}
            size="small"
            type="date"
            value={week}
          />
        </Stack>
      </Stack>

      {coverage?.shifts.map(shift => (
        <CoverageShiftCard
          assignmentChoice={assignmentChoice[shift.id] ?? ""}
          key={shift.id}
          onArchive={onArchive}
          onAssign={onAssign}
          onCancel={onCancel}
          onEdit={onEdit}
          onSelectStaff={onSelectStaff}
          onUnassign={onUnassign}
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
