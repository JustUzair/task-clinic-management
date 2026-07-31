import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { ImportReport } from "../../features/manager/types";

export function ImportReportDetails({
  loading,
  report,
}: {
  loading: boolean;
  report: ImportReport | null;
}) {
  if (loading) {
    return (
      <Box sx={{ alignItems: "center", display: "flex", gap: 1, p: 2 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Loading row evidence…</Typography>
      </Box>
    );
  }
  if (!report) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Typography component="h3" sx={{ fontWeight: 600 }}>
        Merged and rejected rows
      </Typography>
      {report.rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
          This import has no merged or rejected rows.
        </Typography>
      ) : (
        <>
          <Stack spacing={1.5} sx={{ display: { md: "none", xs: "flex" }, mt: 1.5 }}>
            {report.rows.map(row => (
              <Paper
                key={row.id}
                sx={{ border: "1px solid", borderColor: "divider", p: 1.75 }}
                variant="outlined"
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.75 }}
                  >
                    <DetailPill label={`Row ${row.sourceRowNumber}`} />
                    <DetailPill label={row.status.toLowerCase()} />
                    <DetailPill label={row.reasonCode ?? "No reason code"} />
                  </Stack>
                  <DetailBlock label="Action" value={row.action} />
                  <Divider />
                  <DetailBlock label="Explanation" value={row.explanation} />
                  <Divider />
                  <DetailBlock
                    label="Existing record"
                    value={
                      row.linkedEntity && row.linkedRecordId
                        ? `${row.linkedEntity} ${row.linkedRecordId}`
                        : "—"
                    }
                  />
                  <Divider />
                  <JsonBlock label="Raw row" value={row.rawData} />
                  <Divider />
                  <JsonBlock label="Normalized" value={row.normalizedData} />
                </Stack>
              </Paper>
            ))}
          </Stack>

          <TableContainer sx={{ display: { md: "block", xs: "none" }, mt: 1 }}>
            <Table aria-label="Import row evidence" size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Explanation</TableCell>
                  <TableCell>Raw row</TableCell>
                  <TableCell>Normalized</TableCell>
                  <TableCell>Existing record</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.rows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>{row.sourceRowNumber}</TableCell>
                    <TableCell>{row.status.toLowerCase()}</TableCell>
                    <TableCell>{row.reasonCode ?? "—"}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.explanation}</TableCell>
                    <JsonCell value={row.rawData} />
                    <JsonCell value={row.normalizedData} />
                    <TableCell>
                      {row.linkedEntity && row.linkedRecordId
                        ? `${row.linkedEntity} ${row.linkedRecordId}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}

function JsonCell({ value }: { value: unknown }) {
  return (
    <TableCell>
      <Box
        component="code"
        sx={{
          display: "block",
          fontFamily: "monospace",
          maxWidth: 320,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value ? JSON.stringify(value) : "—"}
      </Box>
    </TableCell>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, wordBreak: "break-word" }} variant="body2">
        {value}
      </Typography>
    </Box>
  );
}

function DetailPill({ label }: { label: string }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 999,
        px: 1,
        py: 0.5,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Box>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <Box>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Box
        component="code"
        sx={{
          display: "block",
          fontFamily: "monospace",
          fontSize: 12,
          mt: 0.75,
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
      >
        {value ? JSON.stringify(value, null, 2) : "—"}
      </Box>
    </Box>
  );
}
