"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { KeyRound, Mail, ShieldEllipsis } from "lucide-react";
import { useLogin } from "../../features/auth/use-login";
import { LoadingIndicator } from "../loading-indicator";

export function LoginForm() {
  const auth = useLogin();

  return (
    <Paper
      component="section"
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "rgba(16, 35, 45, 0.08)",
        maxWidth: 460,
        overflow: "hidden",
        p: { xs: 3, sm: 4 },
        width: "100%",
      }}
    >
      <Stack spacing={3}>
        <Box
          sx={{
            background:
              "linear-gradient(135deg, rgba(20,125,116,0.12) 0%, rgba(20,125,116,0.04) 100%)",
            border: "1px solid",
            borderColor: "rgba(20,125,116,0.12)",
            borderRadius: 2,
            p: 2.25,
          }}
        >
          <Typography
            color="primary"
            sx={{ fontWeight: 800, letterSpacing: "0.18em" }}
            variant="overline"
          >
            Secure clinic access
          </Typography>
          <Typography component="h1" sx={{ mt: 0.5 }} variant="h5">
            Sign in with a one-time code
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
            Use the imported manager or staff email for this clinic workspace.
          </Typography>
        </Box>

        {auth.checkingSession ? (
          <LoadingIndicator label="Checking your session…" />
        ) : auth.login.otpSessionId ? (
          <Stack component="form" onSubmit={auth.verifyOtp} spacing={2}>
            <TextField
              autoComplete="one-time-code"
              disabled={auth.loading}
              fullWidth
              label="Six-digit code"
              onChange={event => auth.update("otp", event.target.value)}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShieldEllipsis size={18} />
                    </InputAdornment>
                  ),
                },
                htmlInput: {
                  inputMode: "numeric",
                  maxLength: 6,
                  minLength: 6,
                  pattern: "\\d{6}",
                },
              }}
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
              label="Keep me signed in on this browser for 1 day"
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
          <Stack component="form" onSubmit={auth.requestOtp} spacing={2}>
            <TextField
              autoComplete="email"
              disabled={auth.loading}
              fullWidth
              label="Work email"
              onChange={event => auth.update("email", event.target.value)}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} />
                    </InputAdornment>
                  ),
                },
              }}
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
                "Send code"
              )}
            </Button>
          </Stack>
        )}

        <Box
          sx={{
            alignItems: "center",
            color: "text.secondary",
            display: "flex",
            gap: 1,
          }}
        >
          <KeyRound size={16} />
          <Typography variant="caption">
            Access is limited to imported staff and manager accounts.
          </Typography>
        </Box>

        {auth.error ? <Alert severity="error">{auth.error}</Alert> : null}
      </Stack>
    </Paper>
  );
}
