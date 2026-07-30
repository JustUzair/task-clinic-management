import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  Clock3,
  PencilLine,
  Trash2,
  UserPlus2,
  UserRoundX,
} from "lucide-react";
import type { CoverageShift, StaffProfile } from "../../features/manager/types";
import { coverageStatusLabel, professionLabel } from "../../lib/display";

const coverageColors = {
  empty: "error",
  full: "success",
  partial: "warning",
} as const;

export function CoverageShiftCard({
  assignmentChoice,
  busy,
  onArchive,
  onAssign,
  onCancel,
  onEdit,
  onSelectStaff,
  onUnassign,
  pendingAction,
  shift,
  staff,
}: {
  assignmentChoice: string;
  busy: boolean;
  onArchive: (shiftId: string) => Promise<unknown>;
  onAssign: (shiftId: string) => Promise<unknown>;
  onCancel: (shiftId: string) => Promise<unknown>;
  onEdit: (shift: CoverageShift) => void;
  onSelectStaff: (shiftId: string, staffProfileId: string) => void;
  onUnassign: (assignmentId: string) => Promise<unknown>;
  pendingAction: string | null;
  shift: CoverageShift;
  staff: StaffProfile[];
}) {
  const now = Date.now();
  const hasStarted = new Date(shift.startsAt).getTime() <= now;
  const isComplete = new Date(shift.endsAt).getTime() <= now;
  const immutable = hasStarted;
  const lockLabel = isComplete ? "Completed" : "In progress";
  const assignedStaffIds = new Set(
    shift.assignments.map(assignment => assignment.staffProfile.id),
  );
  const assigning = pendingAction === `assign:${shift.id}`;

  return (
    <Card
      sx={{
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
      variant="outlined"
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Clock3 size={16} />
              <Typography sx={{ fontWeight: 700 }}>
                {shift.localTime.date} · {shift.localTime.startTime}–
                {shift.localTime.endTime}
                {shift.localTime.overnight ? " (+1 day)" : ""}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <Chip
                color={coverageColors[shift.coverageStatus]}
                label={coverageStatusLabel(shift.coverageStatus)}
                size="small"
              />
              {immutable ? (
                <Chip
                  color={isComplete ? "default" : "warning"}
                  label={lockLabel}
                  size="small"
                  variant="outlined"
                />
              ) : null}
            </Stack>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 2.5 }}
        >
          {Object.entries(shift.roles).map(([role, value]) => (
            <Paper
              key={role}
              sx={{
                backgroundColor: "rgba(20, 125, 116, 0.04)",
                borderColor: "rgba(20, 125, 116, 0.08)",
                flex: 1,
                p: 1.5,
              }}
              variant="outlined"
            >
              <Typography sx={{ fontWeight: 700 }} variant="body2">
                {professionLabel(role)}
              </Typography>
              <Typography sx={{ mt: 0.25 }} variant="h6">
                {value.claimed}/{value.required}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 0.25 }}
                variant="caption"
              >
                {value.missing ? `${value.missing} missing` : "Fully staffed"}
              </Typography>
            </Paper>
          ))}
        </Stack>

        {shift.assignments.length ? (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography color="text.secondary" variant="overline">
              Assigned staff
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {shift.assignments.map(assignment => (
                <Chip
                  key={assignment.id}
                  deleteIcon={<UserRoundX size={16} />}
                  label={`${assignment.staffProfile.account.fullName} · ${professionLabel(
                    assignment.staffProfile.profession,
                  )}`}
                  onDelete={
                    immutable || busy
                      ? undefined
                      : () => void onUnassign(assignment.id)
                  }
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        ) : null}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 2 }}
        >
          <FormControl disabled={immutable || busy} fullWidth size="small">
            <InputLabel id={`assign-staff-${shift.id}`}>
              Assign staff
            </InputLabel>
            <Select
              label="Assign staff"
              labelId={`assign-staff-${shift.id}`}
              onChange={event =>
                onSelectStaff(shift.id, event.target.value as string)
              }
              value={assignmentChoice}
            >
              {staff.map(member => (
                <MenuItem
                  disabled={assignedStaffIds.has(member.id)}
                  key={member.id}
                  value={member.id}
                >
                  {member.account.fullName} ·{" "}
                  {professionLabel(member.profession)}
                  {assignedStaffIds.has(member.id) ? " · already assigned" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            disabled={immutable || busy || !assignmentChoice}
            onClick={() => void onAssign(shift.id)}
            startIcon={assigning ? undefined : <UserPlus2 size={16} />}
            variant="contained"
          >
            {assigning ? (
              <>
                <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                Updating…
              </>
            ) : (
              "Assign"
            )}
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
          <Button
            disabled={immutable || busy}
            onClick={() => onEdit(shift)}
            size="small"
            startIcon={<PencilLine size={16} />}
            variant="outlined"
          >
            Edit
          </Button>
          <Button
            disabled={immutable || busy}
            onClick={() => void onCancel(shift.id)}
            size="small"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            color="error"
            disabled={immutable || busy}
            onClick={() => void onArchive(shift.id)}
            size="small"
            startIcon={<Trash2 size={16} />}
          >
            Archive
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
