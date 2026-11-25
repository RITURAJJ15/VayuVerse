import React from "react";
import { cn } from "@/lib/cn";

interface TopographicArtProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Topographic Contour-Line Artwork (matching Image 1 approved design)
 * Circular organic contour lines evoking natural atmospheric flow and elevation.
 */
export function TopographicArt({ className, size = 320, ...props }: TopographicArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <clipPath id="circle-topo-mask">
          <circle cx="160" cy="160" r="158" />
        </clipPath>
      </defs>

      {/* Outer bounding circle in fine border stroke */}
      <circle
        cx="160"
        cy="160"
        r="159"
        stroke="#D6D6D2"
        strokeWidth="1"
        strokeDasharray="2 2"
        className="opacity-60"
      />

      {/* Clipped group containing dense, organic contour curves */}
      <g clipPath="url(#circle-topo-mask)" stroke="#C4C9C3" strokeWidth="1" fill="none">
        {/* Central rings / contour ridges */}
        <circle cx="160" cy="160" r="14" />
        <circle cx="160" cy="160" r="28" stroke="#B8BEB7" />
        <circle cx="160" cy="160" r="42" />
        <path d="M110 160 C 110 132, 132 104, 160 104 C 188 104, 214 130, 214 160 C 214 190, 185 218, 160 218 C 135 218, 110 188, 110 160 Z" />
        <path d="M96 160 C 96 124, 124 90, 160 90 C 196 90, 228 122, 228 160 C 228 198, 192 232, 160 232 C 128 232, 96 196, 96 160 Z" />
        <path d="M82 160 C 82 116, 116 76, 160 76 C 204 76, 242 114, 242 160 C 242 206, 198 246, 160 246 C 122 246, 82 204, 82 160 Z" />
        <path d="M68 160 C 68 108, 108 62, 160 62 C 212 62, 256 106, 256 160 C 256 214, 206 260, 160 260 C 114 260, 68 212, 68 160 Z" />
        <path d="M54 160 C 54 100, 100 48, 160 48 C 220 48, 270 98, 270 160 C 270 222, 214 274, 160 274 C 106 274, 54 220, 54 160 Z" />
        <path d="M40 160 C 40 92, 92 34, 160 34 C 228 34, 284 90, 284 160 C 284 230, 222 288, 160 288 C 98 288, 40 228, 40 160 Z" />
        <path d="M26 160 C 26 84, 84 20, 160 20 C 236 20, 298 82, 298 160 C 298 238, 230 302, 160 302 C 90 302, 26 236, 26 160 Z" />
        <path d="M12 160 C 12 76, 76 6, 160 6 C 244 6, 312 74, 312 160 C 312 246, 238 316, 160 316 C 82 316, 12 244, 12 160 Z" />

        {/* Organic undulating ridge lines crossing diagonally */}
        <path d="M-20 80 Q 80 120, 160 60 T 340 100" stroke="#BAC1B9" />
        <path d="M-20 120 Q 90 170, 160 110 T 340 150" />
        <path d="M-20 160 Q 100 220, 170 160 T 340 200" stroke="#BAC1B9" />
        <path d="M-20 200 Q 110 260, 180 210 T 340 250" />
        <path d="M-20 240 Q 120 300, 190 260 T 340 290" />

        {/* Flow vectors */}
        <path d="M140 -20 Q 160 80, 220 160 T 180 340" strokeDasharray="3 3" opacity="0.6" />
        <path d="M100 -20 Q 130 90, 180 170 T 130 340" strokeDasharray="4 4" opacity="0.5" />
      </g>
    </svg>
  );
}
