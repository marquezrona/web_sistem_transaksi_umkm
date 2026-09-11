export function ScrollArea({ children, className = '', ...props }) {
  return <div {...props} className={`overflow-auto ${className}`}>{children}</div>;
}
