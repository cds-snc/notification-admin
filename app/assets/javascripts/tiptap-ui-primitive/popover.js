import React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export function Popover({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  modal = false,
}) {
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      modal={modal}
    >
      {children}
    </PopoverPrimitive.Root>
  );
}

export function PopoverTrigger({ children, asChild = false, ...props }) {
  return (
    <PopoverPrimitive.Trigger asChild={asChild} {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  );
}

export function PopoverContent({
  children,
  side = "bottom",
  align = "center",
  portal = true,
  className = "",
  sideOffset = 8,
  ...props
}) {
  const content = (
    <PopoverPrimitive.Content
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={["tiptap-popover-content", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </PopoverPrimitive.Content>
  );

  if (!portal) return content;

  return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
}
