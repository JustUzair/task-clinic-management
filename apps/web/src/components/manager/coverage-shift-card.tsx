import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type {
  CoverageShift,
  StaffProfile,
} from "../../features/manager/types";

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
  const immutable = new Date(shift.startsAt).getTime() <= Date.now();
  const assignedStaffIds = new Set(
    shift.assignments.map(assignment => assignment.staffProfile.id),
  );
  const assigning = pendingAction === `assign:${shift.id}`;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <div>
            <Typography sx={{ fontWeight: 600 }}>
              {shift.localTime.date} · {shift.localTime.startTime}–
              {shift.localTime.endTime}
              {shift.localTime.overnight ? " (+1 day)" : ""}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                color={coverageColors[shift.coverageStatus]}
                label={shift.coverageStatus}
                size="small"
              />
              {immutable ? <Chip label="Locked" size="small" /> : null}
            </Stack>
          </div>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          {Object.entries(shift.roles).map(([role, value]) => (
            <Paper
              key={role}
              sx={{ flex: 1, p: 1.5 }}
              variant="outlined"
            >
              <Typography sx={{ textTransform: "capitalize" }} variant="body2">
                {role}: {value.claimed}/{value.required}
              </Typography>
              <Typography color="text.secondary" variant="caption">
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
            <Stack
              direction="row"
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              {shift.assignments.map(assignment => (
                <Chip
                  key={assignment.id}
                  label={`${assignment.staffProfile.account.fullName} · ${assignment.staffProfile.profession.toLowerCase()}`}
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

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <FormControl disabled={immutable || busy} fullWidth size="small">
            <InputLabel id={`assign-staff-${shift.id}`}>Assign staff</InputLabel>
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
                  {member.profession.toLowerCase()}
                  {assignedStaffIds.has(member.id)
                    ? " · already assigned"
                    : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            disabled={immutable || busy || !assignmentChoice}
            onClick={() => void onAssign(shift.id)}
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
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Button
          disabled={immutable || busy}
          onClick={() => onEdit(shift)}
          size="small"
        >
          Edit
        </Button>
        <Button
          disabled={immutable || busy}
          onClick={() => void onCancel(shift.id)}
          size="small"
        >
          Cancel
        </Button>
        <Button
          color="error"
          disabled={immutable || busy}
          onClick={() => void onArchive(shift.id)}
          size="small"
        >
          Archive
        </Button>
      </CardActions>
    </Card>
  );
}
