/**
 * GolfPulse — Financial CSV Export Helper
 * RFC 4180 compliant with strict formula injection mitigation.
 */

/**
 * Escapes a cell value for safe CSV output.
 * Prevents CSV / Excel formula injection (DDE attacks) by prefixing
 * dangerous characters (=, +, -, @, tab, CR) with a single quote.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }

  let str = String(val);

  // Formula injection mitigation: if cell begins with dangerous characters, prepend single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If string contains comma, quote, or newline, escape quotes and wrap in quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Formats an array of objects into an RFC 4180 CSV string with UTF-8 BOM.
 */
export function generateCsv(columns: { key: string; label: string }[], rows: Record<string, any>[]): string {
  // UTF-8 BOM helps Excel open UTF-8 CSVs without character encoding issues
  const BOM = "\uFEFF";

  const headerLine = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(row[c.key])).join(",")
  );

  return BOM + [headerLine, ...dataLines].join("\r\n");
}
