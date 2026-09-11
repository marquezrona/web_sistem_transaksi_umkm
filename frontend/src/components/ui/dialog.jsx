import { Children, cloneElement, isValidElement } from "react";

export function Dialog({ children, open, onOpenChange, ...props }) {
  const items = Children.toArray(children);
  const trigger = items.find(child => child.type === DialogTrigger);
  const content = items.filter(child => child.type !== DialogTrigger);

  return (
    <>
      {trigger && cloneElement(trigger, { onOpenChange })}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" {...props}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export function DialogContent({ children, className = '', ...props }) {
  return <div className={`space-y-4 ${className}`} {...props}>{children}</div>;
}

export function DialogHeader({ children, ...props }) {
  return <div {...props}>{children}</div>;
}

export function DialogTitle({ children, ...props }) {
  return <h3 {...props} className="text-lg font-semibold text-slate-900">{children}</h3>;
}

export function DialogTrigger({ children, asChild, onOpenChange, ...props }) {
  const handleClick = (event) => {
    children.props?.onClick?.(event);
    onOpenChange?.(true);
  };

  if (asChild && isValidElement(children)) {
    return cloneElement(children, { onClick: handleClick });
  }
  return <button {...props} onClick={handleClick}>{children}</button>;
}
