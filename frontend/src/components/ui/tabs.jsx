export function Tabs({ children, ...props }) {
  return <div {...props}>{children}</div>;
}

export function TabsList({ children, ...props }) {
  return <div {...props} className="flex gap-2">{children}</div>;
}

export function TabsTrigger({ children, ...props }) {
  return <button {...props} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">{children}</button>;
}
