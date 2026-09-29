export type Row = Record<string, unknown>;

export function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter(isRow);
  if (!isRow(value)) return [];
  for (const key of ["items", "data", "sets", "resources", "textbooks", "reports"]) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested.filter(isRow);
  }
  return [];
}

export function text(row: Row, key: string): string {
  const value = row[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function display(value: string): string {
  return value.trim() ? value : "—";
}

export function formatWhen(value: unknown): string {
  if (value == null || value === "") return "—";
  const date = new Date(typeof value === "number" ? value : String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function whenField(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const formatted = formatWhen(row[key]);
    if (formatted !== "—") return formatted;
  }
  return "—";
}

export function examYears(row: Row): string {
  const value = row.exam_years;
  if (!Array.isArray(value) || value.length === 0) return "—";
  const years = value.map((year) => String(year).trim()).filter(Boolean);
  return years.length > 0 ? years.join(", ") : "—";
}

export function activeLabel(row: Row): string {
  if (row.is_active === true) return "Yes";
  if (row.is_active === false) return "No";
  return "—";
}

export function countStatus(rows: Row[], status: string): number {
  const target = status.toLowerCase();
  return rows.filter((row) => text(row, "status").toLowerCase() === target).length;
}
