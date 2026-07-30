import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CalendarRange } from "lucide-react";
import type { PersonalAssignment } from "../../features/staff/types";
import { LoadingIndicator } from "../loading-indicator";
import { ShiftTime } from "./shift-time";

interface ScheduleGroup {
  assignments: PersonalAssignment[];
  title: string;
  unclaimable?: boolean;
}

export function PersonalSchedule({
  busy,
  groups,
  onUnclaim,
  pendingId,
}: {
  busy: boolean;
  groups: ScheduleGroup[];
  onUnclaim: (assignmentId: string) => Promise<void>;
  pendingId: string | null;
}) {
  return (
    <Box component="section">
      <Paper
        sx={{ border: "1px solid", borderColor: "divider", p: 2.5 }}
        variant="outlined"
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
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
              <CalendarRange size={18} />
            </Box>
            <Box>
              <Typography component="h2" variant="h6">
                My schedule
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Upcoming, ongoing, completed, and removed shifts in one place.
              </Typography>
            </Box>
          </Stack>
          {busy ? <LoadingIndicator label="Updating schedule…" /> : null}
        </Stack>
      </Paper>
      <Paper
        sx={{
          border: "1px solid",
          borderColor: "divider",
          maxHeight: 420,
          mt: 2,
          overflowY: "auto",
          p: 2,
        }}
        variant="outlined"
      >
        <Stack divider={<Divider flexItem />} spacing={2}>
          {groups.map(group => (
            <Box key={group.title}>
              <Typography component="h3" sx={{ fontWeight: 700 }}>
                {group.title} ({group.assignments.length})
              </Typography>
              <Stack
                divider={<Divider flexItem />}
                spacing={1.5}
                sx={{ mt: 1.5 }}
              >
                {group.assignments.map(assignment => (
                  <Box key={assignment.id}>
                    <Typography sx={{ fontWeight: 600 }} variant="body2">
                      <ShiftTime time={assignment.shift.localTime} />
                    </Typography>
                    {assignment.shift.externalShiftId ? (
                      <Typography color="text.secondary" variant="caption">
                        # {assignment.shift.externalShiftId}
                      </Typography>
                    ) : null}
                    <Typography color="text.secondary" variant="caption">
                      {" | "}
                      {assignment.origin === "MANAGER_ASSIGNED"
                        ? "Assigned by manager"
                        : "Self-claimed"}
                    </Typography>
                    {group.unclaimable ? (
                      assignment.origin === "SELF_CLAIMED" ? (
                        <Button
                          color="error"
                          disabled={busy || pendingId !== null}
                          onClick={() => void onUnclaim(assignment.id)}
                          size="small"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          {pendingId === assignment.id ? (
                            <>
                              <CircularProgress
                                color="inherit"
                                size={14}
                                sx={{ mr: 1 }}
                              />
                              Removing…
                            </>
                          ) : (
                            "Unclaim shift"
                          )}
                        </Button>
                      ) : (
                        <Typography
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                          variant="caption"
                        >
                          Manager assignments can only be removed by a manager.
                        </Typography>
                      )
                    ) : null}
                  </Box>
                ))}
                {group.assignments.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    None
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
