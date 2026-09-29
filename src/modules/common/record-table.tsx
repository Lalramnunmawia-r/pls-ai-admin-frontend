"use client";

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export function RecordTable<T>({
  rows,
  columns,
  empty
}: {
  rows: T[];
  columns: Column<T>[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">{empty}</p>;
  }

  return (
    <div className="overflow-auto rounded border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 align-top text-slate-700">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
