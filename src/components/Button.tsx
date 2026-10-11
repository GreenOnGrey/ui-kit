import type { ButtonHTMLAttributes } from "react";

type Native = ButtonHTMLAttributes<HTMLButtonElement>;

/** `button.btn` with its variants. The classes stay a legitimate way to use a
 * button (FTR.NAB.CMN-0005 tech, decision 1); the component is for new code. */
export function Button({ variant, size, className, type = "button", ...rest }: Native & {
  variant?: "primary" | "ghost" | "danger"; size?: "sm";
}) {
  const cls = ["btn", variant, size, className].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...rest} />;
}

/** `button.iconbtn`: a button with an icon only, so the label is required. */
export function IconButton({ label, fill, on, className, type = "button", ...rest }: Omit<Native, "aria-label"> & {
  label: string; fill?: boolean; on?: boolean;
}) {
  const cls = ["iconbtn", fill && "fill", on && "on", className].filter(Boolean).join(" ");
  return <button type={type} className={cls} aria-label={label} {...rest} />;
}
