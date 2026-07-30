"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
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
import { FileSpreadsheet, Upload } from "lucide-react";
import { Fragment, type ChangeEvent, useState } from "react";
import { loadImportReport } from "../../features/manager/manager-api";
import type {
  ImportBatch,
  ImportReport,
} from "../../features/manager/types";
import { importTypeLabel } from "../../lib/display";
import { ImportReportDetails } from "./import-report-details";

export function ImportPanel({
  busy,
  feedback,
  imports,
  onDismissFeedback,
  onUpload,
  pendingAction,
}: {
  busy: boolean;
  feedback: { message: string; severity: "error" | "success" } | null;
  imports: ImportBatch[];
  onDismissFeedback: () => void;
  onUpload: (type: "staff" | "shifts", file: File) => Promise<unknown>;
  pendingAction: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  async function toggleReport(batchId: string) {
    if (expandedId === batchId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(batchId);
    setReport(null);
    setReportError("");
    setLoadingReport(true);
    try {
      setReport(await loadImportReport(batchId));
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : "Unable to load row evidence",
      );
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <Stack component="section" spacing={2} sx={{ mt: 4 }}>
      <Paper sx={{ border: "1px solid", borderColor: "divider", p: 2.5 }} variant="outlined">
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
            <FileSpreadsheet size={18} />
          </Box>
          <Box>
            <Typography component="h2" variant="h6">
              CSV imports
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Upload staff and shift files with the same validation pipeline
              used during seeding.
            </Typography>
          </Box>
        </Stack>
      </Paper>
      {feedback ? (
        <Alert onClose={onDismissFeedback} severity={feedback.severity}>
          {feedback.message}
        </Alert>
      ) : null}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { md: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        {(["staff", "shifts"] as const).map(type => (
          <UploadForm
            busy={busy}
            key={type}
            onUpload={onUpload}
            pendingAction={pendingAction}
            type={type}
          />
        ))}
      </Box>
      {reportError ? <Alert severity="error">{reportError}</Alert> : null}

      <TableContainer
        component={Paper}
        sx={{ border: "1px solid", borderColor: "divider" }}
        variant="outlined"
      >
        <Table aria-label="Import batches" size="small">
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Accepted</TableCell>
              <TableCell>Merged</TableCell>
              <TableCell>Rejected</TableCell>
              <TableCell>Evidence</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {imports.map(batch => (
              <Fragment key={batch.id}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{batch.sourceFilename}</TableCell>
                  <TableCell>{importTypeLabel(batch.type)}</TableCell>
                  <TableCell>{batch.acceptedRows}</TableCell>
                  <TableCell>{batch.mergedRows}</TableCell>
                  <TableCell>{batch.rejectedRows}</TableCell>
                  <TableCell>
                    <Button
                      disabled={busy || loadingReport}
                      onClick={() => void toggleReport(batch.id)}
                      size="small"
                    >
                      {expandedId === batch.id ? "Hide" : "View rows"}
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6} sx={{ p: 0 }}>
                    <Collapse
                      in={expandedId === batch.id}
                      timeout="auto"
                      unmountOnExit
                    >
                      <ImportReportDetails
                        loading={loadingReport}
                        report={report}
                      />
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function UploadForm({
  busy,
  onUpload,
  pendingAction,
  type,
}: {
  busy: boolean;
  onUpload: (type: "staff" | "shifts", file: File) => Promise<unknown>;
  pendingAction: string | null;
  type: "staff" | "shifts";
}) {
  const [file, setFile] = useState<File | null>(null);
  const expectedHeaders =
    type === "staff"
      ? "staff_id, full_name, role, email"
      : "shift_id, date, start_time, end_time, requirements";
  const uploading = pendingAction === `upload:${type}`;

  return (
    <Paper
      component="form"
      onSubmit={event => {
        event.preventDefault();
        if (file) void onUpload(type, file).then(() => setFile(null));
      }}
      sx={{ border: "1px solid", borderColor: "divider", p: 2.25 }}
      variant="outlined"
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              alignItems: "center",
              backgroundColor: "rgba(20, 125, 116, 0.08)",
              borderRadius: 3,
              color: "primary.main",
              display: "flex",
              height: 38,
              justifyContent: "center",
              width: 38,
            }}
          >
            <Upload size={16} />
          </Box>
          <Typography sx={{ fontWeight: 700 }}>
            Import {importTypeLabel(type)} CSV
          </Typography>
        </Stack>
        <Typography color="text.secondary" variant="caption">
          Expected headers: {expectedHeaders}
        </Typography>
        <Divider />
        <Button component="label" disabled={busy} variant="outlined">
          {file ? file.name : "Choose CSV file"}
          <Box
            accept=".csv,text/csv"
            component="input"
            hidden
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFile(event.target.files?.[0] ?? null)
            }
            type="file"
          />
        </Button>
        <Button disabled={busy || !file} type="submit" variant="contained">
          {uploading ? (
            <>
              <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
              Importing…
            </>
          ) : (
            "Upload and process"
          )}
        </Button>
      </Stack>
    </Paper>
  );
}
