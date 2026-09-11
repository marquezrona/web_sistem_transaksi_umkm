export function Label({ children, className = '', ...props }) {
  return (
    <label {...props} className={`mb-1.5 block text-sm font-medium text-slate-700 ${className}`}>
      {children}
    </label>
  );
}
