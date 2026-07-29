"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Fragment, type ChangeEvent, useState } from "react";
import { loadImportReport } from "../../features/manager/manager-api";
import type {
  ImportBatch,
  ImportReport,
} from "../../features/manager/types";
import { ImportReportDetails } from "./import-report-details";

export function ImportPanel({
  imports,
  onUpload,
}: {
  imports: ImportBatch[];
  onUpload: (type: "staff" | "shifts", file: File) => Promise<unknown>;
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
      <Typography component="h2" variant="h6">
        CSV imports
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { md: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        {(["staff", "shifts"] as const).map(type => (
          <UploadForm key={type} onUpload={onUpload} type={type} />
        ))}
      </Box>

      <TableContainer component={Paper} variant="outlined">
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
                  <TableCell>{batch.sourceFilename}</TableCell>
                  <TableCell>{batch.type.toLowerCase()}</TableCell>
                  <TableCell>{batch.acceptedRows}</TableCell>
                  <TableCell>{batch.mergedRows}</TableCell>
                  <TableCell>{batch.rejectedRows}</TableCell>
                  <TableCell>
                    <Button
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
                      {reportError ? (
                        <Alert severity="error" sx={{ m: 2, mt: 0 }}>
                          {reportError}
                        </Alert>
                      ) : null}
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
  onUpload,
  type,
}: {
  onUpload: (type: "staff" | "shifts", file: File) => Promise<unknown>;
  type: "staff" | "shifts";
}) {
  const [file, setFile] = useState<File | null>(null);
  const expectedHeaders =
    type === "staff"
      ? "staff_id, full_name, role, email"
      : "shift_id, date, start_time, end_time, requirements";

  return (
    <Paper
      component="form"
      onSubmit={event => {
        event.preventDefault();
        if (file) void onUpload(type, file).then(() => setFile(null));
      }}
      sx={{ p: 2 }}
      variant="outlined"
    >
      <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 600, textTransform: "capitalize" }}>
          Import {type} CSV
        </Typography>
        <Typography color="text.secondary" variant="caption">
          Expected headers: {expectedHeaders}
        </Typography>
        <Button component="label" variant="outlined">
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
        <Button disabled={!file} type="submit" variant="contained">
          Upload and import
        </Button>
      </Stack>
    </Paper>
  );
}
