import * as React from "react";
import { cn } from "../../lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium transition-colors " +
      "focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      default: "bg-neutral-900 text-white hover:bg-neutral-800",
      outline: "border border-neutral-300 bg-white hover:bg-neutral-50",
      ghost: "hover:bg-neutral-100",
    };
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3",
      lg: "h-11 px-6",
      icon: "h-8 w-8 p-0",
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button };
