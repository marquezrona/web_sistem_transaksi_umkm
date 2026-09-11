export function Button({ children, className = '', variant = 'default', size = 'default', ...props }) {
  const variants = {
    default: 'bg-[#0A3663] text-white hover:bg-[#0C2340]',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-11 px-6',
    icon: 'h-9 w-9',
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
    >
      {children}
    </button>
  );
}
