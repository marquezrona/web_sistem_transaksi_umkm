export function Card({ children, className = '', ...props }) {
  return (
    <div {...props} className={`rounded-xl border border-[#E5DEC9] bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}
