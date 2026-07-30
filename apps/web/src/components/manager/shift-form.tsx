"use client";

import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { CalendarPlus2 } from "lucide-react";
import type { FormEvent } from "react";
import type { ShiftFormState } from "../../features/manager/types";
import { useClinicNow } from "../../features/manager/use-clinic-now";
import { professionLabel } from "../../lib/display";

export function ShiftForm({
  busy,
  editing,
  form,
  open,
  onClose,
  onChange,
  onSave,
  saving,
}: {
  busy: boolean;
  editing: boolean;
  form: ShiftFormState;
  open: boolean;
  onClose: () => void;
  onChange: (form: ShiftFormState) => void;
  onSave: () => Promise<unknown>;
  saving: boolean;
}) {
  const clinicNow = useClinicNow();
  const startHasPassed =
    Boolean(form.date && form.startTime) &&
    (form.date < clinicNow.date ||
      (form.date === clinicNow.date && form.startTime <= clinicNow.time));

  function submit(event: FormEvent) {
    event.preventDefault();
    void onSave();
  }

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      onClose={busy ? undefined : onClose}
      open={open}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle sx={{ pb: 1 }}>
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
              <Typography component="span" variant="h6">
                {editing ? "Edit shift" : "Create shift"}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Set the time window and required coverage before saving.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              disabled={busy}
              label="Date"
              onChange={event =>
                onChange({ ...form, date: event.target.value })
              }
              required
              slotProps={{
                htmlInput: { min: clinicNow.date },
                inputLabel: { shrink: true },
              }}
              type="date"
              value={form.date}
            />
            <Stack direction="row" spacing={1}>
              <TextField
                disabled={busy}
                fullWidth
                label="Start"
                onChange={event =>
                  onChange({ ...form, startTime: event.target.value })
                }
                required
                slotProps={{
                  htmlInput:
                    form.date === clinicNow.date
                      ? { min: clinicNow.time }
                      : undefined,
                  inputLabel: { shrink: true },
                }}
                type="time"
                value={form.startTime}
              />
              <TextField
                disabled={busy}
                fullWidth
                label="End"
                onChange={event =>
                  onChange({ ...form, endTime: event.target.value })
                }
                required
                slotProps={{ inputLabel: { shrink: true } }}
                type="time"
                value={form.endTime}
              />
            </Stack>
            {(["doctor", "nurse", "receptionist"] as const).map(role => (
              <TextField
                disabled={busy}
                key={role}
                label={`${professionLabel(role)} required`}
                onChange={event =>
                  onChange({ ...form, [role]: Number(event.target.value) })
                }
                slotProps={{ htmlInput: { min: 0 } }}
                type="number"
                value={form[role]}
              />
            ))}
            {startHasPassed ? (
              <Alert severity="warning">
                Choose a start time after the current clinic time.
              </Alert>
            ) : null}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ color: "text.secondary" }}
            >
              {(["doctor", "nurse", "receptionist"] as const).map(role => (
                <Typography key={role} variant="caption">
                  {professionLabel(role)} slots: {form[role]}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button disabled={busy} onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            disabled={busy || startHasPassed}
            type="submit"
            variant="contained"
          >
            {saving ? (
              <>
                <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                Saving…
              </>
            ) : editing ? (
              "Save changes"
            ) : (
              "Create shift"
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
