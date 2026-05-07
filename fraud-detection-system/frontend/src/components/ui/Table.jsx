export default function Table({ columns, data, empty = 'No data' }) {
  if (!data?.length) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">{empty}</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-semibold text-slate-700">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-slate-600">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
