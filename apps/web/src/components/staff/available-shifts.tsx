import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CalendarPlus2, CircleAlert } from "lucide-react";
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
  onPageChange,
  pagination,
  pendingId,
  shifts,
}: {
  busy: boolean;
  onClaim: (shiftId: string) => Promise<void>;
  onPageChange: (page: number) => void;
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
  pendingId: string | null;
  shifts: AvailableShift[];
}) {
  return (
    <Box component="section">
      <Card
        sx={{ border: "1px solid", borderColor: "divider" }}
        variant="outlined"
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              alignItems: { xs: "flex-start", md: "center" },
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 1.5,
              justifyContent: "space-between",
            }}
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
                <CalendarPlus2 size={18} />
              </Box>
              <Box>
                <Typography component="h2" variant="h6">
                  Available shifts
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Claim open work that still has capacity for your profession.
                </Typography>
              </Box>
            </Stack>
            {busy ? <LoadingIndicator label="Refreshing shifts…" /> : null}
          </Box>
        </CardContent>
      </Card>
      {shifts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No future shifts available.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { md: "repeat(2, minmax(0, 1fr))", xs: "minmax(0, 1fr)" },
            mt: 2,
          }}
        >
          {shifts.map(item => (
            <Card
              key={item.shift.id}
              sx={{ border: "1px solid", borderColor: "divider" }}
              variant="outlined"
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  <ShiftTime time={item.shift.localTime} />
                </Typography>
                {item.shift.externalShiftId ? (
                  <Typography color="text.secondary" variant="caption">
                    # {item.shift.externalShiftId}
                  </Typography>
                ) : null}
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 1.5, rowGap: 1 }}>
                  <Chip
                    color={item.remaining > 0 ? "success" : "default"}
                    label={`${item.remaining} open`}
                    size="small"
                  />
                  <Chip
                    label={`${item.required} required`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 1.25 }}
                  variant="body2"
                >
                  {item.remaining} of {item.required} places are still available
                  for your profession on this shift.
                </Typography>
                {item.disabledReason ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                      color: "warning.main",
                      mt: 1.25,
                    }}
                  >
                    <CircleAlert size={15} />
                    <Typography variant="caption">
                      {disabledLabels[item.disabledReason] ?? "Unavailable"}
                    </Typography>
                  </Stack>
                ) : null}
                <Button
                  disabled={
                    busy || Boolean(item.disabledReason) || pendingId !== null
                  }
                  fullWidth
                  onClick={() => void onClaim(item.shift.id)}
                  sx={{ mt: 2 }}
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
                    (disabledLabels[item.disabledReason] ?? "Unavailable")
                  ) : (
                    "Claim shift"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {pagination.totalPages > 1 ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "space-between", mt: 2 }}
        >
          <Typography color="text.secondary" variant="body2">
            {pagination.total} matching shifts
          </Typography>
          <Pagination
            color="primary"
            count={pagination.totalPages}
            disabled={busy || pendingId !== null}
            siblingCount={0}
            size="small"
            onChange={(_event, page) => onPageChange(page)}
            page={pagination.page}
          />
        </Stack>
      ) : null}
    </Box>
  );
}
