"use client";

type Row = Record<string, unknown>;

const asRows = (input: unknown): Row[] => {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is Row => typeof item === "object" && item !== null);
};

export function SimpleTable({ items }: { items: unknown }) {
  const rows = asRows(items);
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">No records found.</p>;
  }
  const columns = Object.keys(rows[0]).slice(0, 6);

  return (
    <div className="overflow-auto rounded border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row, idx) => (
            <tr key={idx} className="border-t">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 align-top text-slate-700">
                  {typeof row[col] === "string" || typeof row[col] === "number" ? String(row[col]) : JSON.stringify(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
