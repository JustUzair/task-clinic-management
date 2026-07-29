import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { AvailableShift } from "../../features/staff/types";
import { LoadingIndicator } from "../loading-indicator";
import { ShiftTime } from "./shift-time";

const disabledLabels: Record<string, string> = {
  ALREADY_CLAIMED: "Already claimed",
  OVERLAPPING_ASSIGNMENT: "Overlaps your schedule",
  PROFESSION_FULL: "Profession capacity full",
};

export function AvailableShifts({
  busy,
  onClaim,
  pendingId,
  shifts,
}: {
  busy: boolean;
  onClaim: (shiftId: string) => Promise<void>;
  pendingId: string | null;
  shifts: AvailableShift[];
}) {
  return (
    <Box component="section">
      <Box sx={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <Typography component="h2" variant="h6">
          Available shifts
        </Typography>
        {busy ? <LoadingIndicator label="Refreshing shifts…" /> : null}
      </Box>
      {shifts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No future shifts available.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { md: "repeat(2, minmax(0, 1fr))" },
            mt: 2,
          }}
        >
          {shifts.map(item => (
            <Card key={item.shift.id} variant="outlined">
              <CardContent>
                <Typography sx={{ fontWeight: 600 }}>
                  <ShiftTime time={item.shift.localTime} />
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                  {item.remaining} of {item.required} places remaining for your
                  profession
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  disabled={
                    busy || Boolean(item.disabledReason) || pendingId !== null
                  }
                  onClick={() => void onClaim(item.shift.id)}
                  variant="contained"
                >
                  {pendingId === item.shift.id ? (
                    <>
                      <CircularProgress
                        color="inherit"
                        size={16}
                        sx={{ mr: 1 }}
                      />
                      Claiming…
                    </>
                  ) : item.disabledReason ? (
                    disabledLabels[item.disabledReason] ?? "Unavailable"
                  ) : (
                    "Claim shift"
                  )}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
