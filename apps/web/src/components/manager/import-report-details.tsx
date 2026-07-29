import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
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
        <TableContainer sx={{ mt: 1 }}>
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
