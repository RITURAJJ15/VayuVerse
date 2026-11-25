import React from "react";
import { cn } from "@/lib/cn";

/**
 * Design D — Soft Swiss Minimalist Wind Graphic Elements.
 * Hand-crafted vector streams with delicate stroke weights and restraint.
 */

interface WindGraphicProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: "horizontal" | "corner" | "flow" | "mark";
}

/**
 * Minimalist 3-stream Wind Mark for Logo
 */
export function WindMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6 stroke-current", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Stream 1 - top */}
      <path
        d="M4 11H20C22.2091 11 24 9.20914 24 7C24 4.79086 22.2091 3 20 3C17.7909 3 16 4.79086 16 7"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Stream 2 - middle long */}
      <path
        d="M2 16H23C25.7614 16 28 18.2386 28 21C28 23.7614 25.7614 26 23 26C20.2386 26 18 23.7614 18 21"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Stream 3 - bottom short */}
      <path
        d="M5 21H14"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Horizontal flowing wind-lines banner with low contrast for backgrounds / borders
 */
export function WindLines({ className, variant = "horizontal", ...props }: WindGraphicProps) {
  if (variant === "flow") {
    return (
      <svg
        viewBox="0 0 800 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-full pointer-events-none select-none text-[#AFC8B5]/40", className)}
        preserveAspectRatio="none"
        aria-hidden="true"
        {...props}
      >
        <path
          d="M0 40 Q 200 10, 400 50 T 800 30"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <path
          d="M0 65 Q 180 85, 380 55 T 800 70"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M0 90 Q 260 60, 520 95 T 800 80"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="8 6"
        />
      </svg>
    );
  }

  if (variant === "corner") {
    return (
      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("pointer-events-none select-none text-[#182323]/10", className)}
        aria-hidden="true"
        {...props}
      >
        <path
          d="M20 140 C 60 140, 90 100, 140 100 C 175 100, 195 75, 195 50 C 195 25, 175 10, 150 10 C 130 10, 115 25, 115 45"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M0 90 C 40 90, 70 60, 110 60 C 140 60, 160 40, 160 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 600 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full pointer-events-none select-none text-[#AFC8B5]/30", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0 24 C 150 8, 300 40, 450 18 C 520 8, 570 12, 600 24"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M0 34 C 120 44, 280 14, 420 34 C 500 44, 560 30, 600 32"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="4 3"
      />
    </svg>
  );
}
