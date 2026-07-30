import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function LoadingIndicator({
  label,
  page = false,
  size = 18,
}: {
  label: string;
  page?: boolean;
  size?: number;
}) {
  const content = (
    <Stack
      aria-live="polite"
      direction="row"
      role="status"
      spacing={1}
      sx={{ alignItems: "center" }}
    >
      <CircularProgress size={size} thickness={5} />
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
    </Stack>
  );

  return page ? (
    <Paper
      sx={{
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        justifyContent: "center",
        p: 4,
      }}
      variant="outlined"
    >
      {content}
    </Paper>
  ) : (
    content
  );
}
