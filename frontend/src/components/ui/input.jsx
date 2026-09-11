export function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#0A3663] ${className}`}
    />
  );
}
