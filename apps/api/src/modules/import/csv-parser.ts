import { Buffer } from "node:buffer";
import { parse } from "csv-parse/sync";
import { BadRequestError } from "../../lib/app-error.js";

export interface ParsedCsvRow {
  columnError: string | null;
  raw: Record<string, string>;
  rowNumber: number;
}

export interface CsvLimits {
  maxBytes: number;
  maxRows: number;
}

export function parseCsv(
  content: string,
  expectedHeaders: readonly string[],
  limits: CsvLimits,
): ParsedCsvRow[] {
  if (Buffer.byteLength(content, "utf8") > limits.maxBytes) {
    throw new BadRequestError(
      "IMPORT_FILE_TOO_LARGE",
      `CSV files cannot exceed ${limits.maxBytes} bytes`,
    );
  }

  let records: string[][];
  try {
    records = parse(content, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: false,
    }) as string[][];
  } catch (error) {
    throw new BadRequestError(
      "IMPORT_CSV_INVALID",
      "The file is not valid CSV",
      error instanceof Error ? { parserMessage: error.message } : undefined,
    );
  }

  const [headerRow, ...dataRows] = records;
  if (!headerRow) {
    throw new BadRequestError("IMPORT_FILE_EMPTY", "The CSV file is empty");
  }

  if (
    headerRow.length !== expectedHeaders.length ||
    headerRow.some((header, index) => header !== expectedHeaders[index])
  ) {
    throw new BadRequestError(
      "IMPORT_HEADERS_INVALID",
      `Expected exactly these headers in order: ${expectedHeaders.join(",")}`,
      { receivedHeaders: headerRow },
    );
  }

  if (dataRows.length > limits.maxRows) {
    throw new BadRequestError(
      "IMPORT_ROW_LIMIT_EXCEEDED",
      `CSV files cannot contain more than ${limits.maxRows} data rows`,
    );
  }

  return dataRows.map((columns, index) => {
    const raw = Object.fromEntries(
      expectedHeaders.map((header, columnIndex) => [
        header,
        columns[columnIndex] ?? "",
      ]),
    );

    return {
      columnError:
        columns.length === expectedHeaders.length
          ? null
          : `Expected ${expectedHeaders.length} columns but received ${columns.length}`,
      raw,
      rowNumber: index + 2,
    };
  });
}
