export function Table({ children, className = '', ...props }) {
  return <div className="w-full overflow-x-auto"><table {...props} className={`min-w-[640px] w-full border-collapse text-left ${className}`}>{children}</table></div>;
}
export function TableHeader({ children, ...props }) { return <thead {...props}>{children}</thead>; }
export function TableBody({ children, ...props }) { return <tbody {...props}>{children}</tbody>; }
export function TableRow({ children, ...props }) { return <tr {...props}>{children}</tr>; }
export function TableHead({ children, ...props }) { return <th {...props} className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</th>; }
export function TableCell({ children, ...props }) { return <td {...props} className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{children}</td>; }
