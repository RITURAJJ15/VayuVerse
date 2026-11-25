import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines clsx conditional class logic with tailwind-merge
 * deduplication. Standard pattern for shadcn-style component libs.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
