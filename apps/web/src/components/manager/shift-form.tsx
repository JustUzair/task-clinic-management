"use client";

import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormEvent } from "react";
import type { ShiftFormState } from "../../features/manager/types";
import { useClinicNow } from "../../features/manager/use-clinic-now";

export function ShiftForm({
  busy,
  editing,
  form,
  onChange,
  onSave,
  saving,
}: {
  busy: boolean;
  editing: boolean;
  form: ShiftFormState;
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
    <Paper
      component="form"
      onSubmit={submit}
      sx={{ height: "fit-content", p: 2 }}
      variant="outlined"
    >
      <Stack spacing={2}>
        <Typography component="h2" variant="h6">
          {editing ? "Edit shift" : "Create shift"}
        </Typography>
        <TextField
          disabled={busy}
          label="Date"
          onChange={event => onChange({ ...form, date: event.target.value })}
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
            label={`${role[0]?.toUpperCase()}${role.slice(1)} required`}
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
        <Button
          disabled={busy || startHasPassed}
          size="large"
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
      </Stack>
    </Paper>
  );
}
