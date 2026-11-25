import React from "react";
import { cn } from "@/lib/cn";

/* ── Design D Soft Swiss Minimalist Card ─────────────────────── */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "sage" | "muted" }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[4px] border border-[#DCE2DC] transition-colors",
      variant === "default" && "bg-white",
      variant === "sage" && "bg-[#EAF1E9]/60",
      variant === "muted" && "bg-[#FAFAF7]",
      "shadow-[0_1px_2px_rgba(24,35,35,0.02)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg sm:text-xl font-medium tracking-tight text-[#182323]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-[#526161] leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 sm:p-6 pt-0 sm:pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-5 sm:p-6 pt-0 sm:pt-0 border-t border-[#DCE2DC]/60 mt-4",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
