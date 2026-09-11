export function Badge({ children, className = '', ...props }) {
  return (
    <span
      {...props}
      className={`inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ${className}`}
    >
      {children}
    </span>
  );
}
