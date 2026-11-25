import React from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "softgreen";
  size?: "sm" | "md" | "lg" | "icon";
}

/**
 * Design D — Soft Swiss Minimalist Button
 * Soft green primary button (#AFC8B5) with deep ink text (#182323),
 * fine hairline borders, no neon or excessive drop shadows.
 */
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-[#AFC8B5] text-[#182323] hover:bg-[#9EBDA4] border border-[#9BB9A1]/40 active:translate-y-[1px]",
  softgreen:
    "bg-[#AFC8B5] text-[#182323] hover:bg-[#9EBDA4] border border-[#9BB9A1]/40 active:translate-y-[1px]",
  secondary:
    "bg-[#EAF1E9] text-[#182323] hover:bg-[#DFE9DE] border border-[#DCE2DC] active:translate-y-[1px]",
  outline:
    "bg-transparent border border-[#DCE2DC] text-[#182323] hover:bg-[#EAF1E9]/60 active:translate-y-[1px]",
  ghost:
    "bg-transparent text-[#182323] hover:bg-[#EAF1E9] hover:text-[#182323]",
  destructive:
    "bg-[#B93838] text-white hover:bg-[#9C2D2D] border border-transparent",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs rounded-[4px]",
  md: "h-9 px-4 text-xs tracking-wide uppercase font-semibold rounded-[4px]",
  lg: "h-11 px-6 text-sm tracking-wide font-medium rounded-[4px]",
  icon: "h-9 w-9 rounded-[4px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#182323]",
        "disabled:pointer-events-none disabled:opacity-40 select-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
