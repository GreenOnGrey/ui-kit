import { useEffect, type ReactNode } from "react";
import { useOutside } from "./ui";

/** `.menu`: a popover closed by Escape and by a click outside; it is mounted while
 * open. `onClose` must keep its identity between renders. What is inside
 * (sections `.sec`, lines `.line`, actions `.action`) belongs to the product. */
export function Menu({ onClose, label, className, children }: {
  onClose: () => void; label?: string; className?: string; children: ReactNode;
}) {
  const ref = useOutside<HTMLDivElement>(true, onClose);
  // the focus returns to what opened the menu (CMP-05)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus?.();
  }, []);
  return (
    <div className={`menu${className ? ` ${className}` : ""}`} role="dialog" aria-label={label} ref={ref}>
      {children}
    </div>
  );
}
