"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLogin } from "../../features/auth/use-login";
import { LoadingIndicator } from "../loading-indicator";

export function LoginForm() {
  const auth = useLogin();

  return (
    <Paper
      component="section"
      elevation={2}
      sx={{ maxWidth: 440, p: { xs: 3, sm: 4 }, width: "100%" }}
    >
      <Typography
        color="primary"
        sx={{ fontWeight: 700, letterSpacing: 1 }}
        variant="overline"
      >
        Clinic Shift Scheduler
      </Typography>
      <Typography component="h1" sx={{ mt: 0.5 }} variant="h5">
        Sign in with email OTP
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
        Use a manager or staff email imported into the scheduler.
      </Typography>

      {auth.checkingSession ? (
        <Stack sx={{ mt: 3 }}>
          <LoadingIndicator label="Checking your session…" />
        </Stack>
      ) : auth.login.otpSessionId ? (
        <Stack
          component="form"
          onSubmit={auth.verifyOtp}
          spacing={2}
          sx={{ mt: 3 }}
        >
          <TextField
            autoComplete="one-time-code"
            disabled={auth.loading}
            fullWidth
            slotProps={{
              htmlInput: {
                inputMode: "numeric",
                maxLength: 6,
                minLength: 6,
                pattern: "\\d{6}",
              },
            }}
            label="Six-digit code"
            onChange={event => auth.update("otp", event.target.value)}
            required
            value={auth.login.otp}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={auth.login.rememberMe}
                disabled={auth.loading}
                onChange={event =>
                  auth.update("rememberMe", event.target.checked)
                }
              />
            }
            label="Remember me on this browser"
          />
          <Button
            disabled={auth.loading}
            fullWidth
            size="large"
            type="submit"
            variant="contained"
          >
            {auth.loading ? (
              <>
                <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                Signing in…
              </>
            ) : (
              "Verify and sign in"
            )}
          </Button>
          <Button disabled={auth.loading} onClick={auth.reset} type="button">
            Use another email
          </Button>
        </Stack>
      ) : (
        <Stack
          component="form"
          onSubmit={auth.requestOtp}
          spacing={2}
          sx={{ mt: 3 }}
        >
          <TextField
            autoComplete="email"
            disabled={auth.loading}
            fullWidth
            label="Email"
            onChange={event => auth.update("email", event.target.value)}
            required
            type="email"
            value={auth.login.email}
          />
          <Button
            disabled={auth.loading}
            fullWidth
            size="large"
            type="submit"
            variant="contained"
          >
            {auth.loading ? (
              <>
                <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                Requesting…
              </>
            ) : (
              "Generate OTP"
            )}
          </Button>
        </Stack>
      )}

      {auth.error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {auth.error}
        </Alert>
      ) : null}
    </Paper>
  );
}
