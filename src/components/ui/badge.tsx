import React from "react";
import { cn } from "@/lib/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "sage"
    | "softgreen"
    | "verified"
    | "modeled"
    | "waiting";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-[#182323] text-white border-transparent",
  secondary: "bg-[#EAF1E9] text-[#182323] border-[#DCE2DC]",
  outline: "border-[#DCE2DC] text-[#182323] bg-transparent",
  sage: "bg-[#EAF1E9] text-[#182323] border-[#D8DFD7]",
  softgreen: "bg-[#AFC8B5] text-[#182323] border-[#9EBDA4]",
  verified: "bg-[#EAF1E9] text-[#2E7D4E] border-[#C8DAC7] font-semibold",
  modeled: "bg-[#F7F4EB] text-[#8C6D1F] border-[#E8DFCA]",
  waiting: "bg-[#F2F3EF] text-[#6E7B7A] border-[#DCE0DC]",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "outline", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5",
        "text-[10px] tracking-wider uppercase font-medium transition-colors select-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";
