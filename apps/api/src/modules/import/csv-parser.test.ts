import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv-parser.js";

const headers = ["staff_id", "full_name", "role", "email"] as const;
const limits = { maxBytes: 1_024, maxRows: 2 };

describe("CSV parser", () => {
  it("keeps source row numbers and raw values", () => {
    expect(
      parseCsv(
        "staff_id,full_name,role,email\n101, Ben Ali , Nurse ,ben@example.test\n",
        headers,
        limits,
      ),
    ).toEqual([
      {
        columnError: null,
        raw: {
          email: "ben@example.test",
          full_name: " Ben Ali ",
          role: " Nurse ",
          staff_id: "101",
        },
        rowNumber: 2,
      },
    ]);
  });

  it("records a row-level column mismatch", () => {
    const [row] = parseCsv(
      "staff_id,full_name,role,email\n101,Ben Ali,Nurse\n",
      headers,
      limits,
    );

    expect(row).toMatchObject({
      columnError: "Expected 4 columns but received 3",
      rowNumber: 2,
    });
  });

  it("rejects headers that are missing, reordered, or additional", () => {
    expect(() =>
      parseCsv(
        "email,staff_id,full_name,role\nben@example.test,101,Ben Ali,Nurse\n",
        headers,
        limits,
      ),
    ).toThrowError(expect.objectContaining({ code: "IMPORT_HEADERS_INVALID" }));
  });

  it("enforces byte and row limits before persistence", () => {
    expect(() =>
      parseCsv(
        "staff_id,full_name,role,email\n1,A,Nurse,a@example.test\n2,B,Nurse,b@example.test\n3,C,Nurse,c@example.test\n",
        headers,
        limits,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "IMPORT_ROW_LIMIT_EXCEEDED" }),
    );

    expect(() =>
      parseCsv("x".repeat(1_025), headers, limits),
    ).toThrowError(
      expect.objectContaining({ code: "IMPORT_FILE_TOO_LARGE" }),
    );
  });
});
