import * as React from "react";
import { cn } from "../../lib/utils";
import { Command as CommandPrimitive } from "cmdk";

function Command({ className, ...props }) {
  return (
    <CommandPrimitive
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md border border-neutral-200 bg-white text-neutral-900",
        className
      )}
      {...props}
    />
  );
}

const CommandInput = React.forwardRef(({ className, ...props }, ref) => (
  <div className="flex items-center border-b border-neutral-200 px-2">
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-neutral-400",
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = "CommandInput";

function CommandList(props) {
  return <CommandPrimitive.List {...props} />;
}
function CommandEmpty(props) {
  return <div className="p-3 text-sm text-neutral-500" {...props} />;
}
function CommandGroup({ className, ...props }) {
  return (
    <CommandPrimitive.Group className={cn("p-2 text-sm", className)} {...props} />
  );
}
function CommandItem({ className, ...props }) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none aria-selected:bg-neutral-100",
        className
      )}
      {...props}
    />
  );
}
function CommandSeparator() {
  return <div className="my-1 h-px bg-neutral-200" />;
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
};
