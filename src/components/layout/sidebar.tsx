import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Calendar,
  FlaskConical,
  Home,
  Leaf,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "My Day", href: "/my-day", icon: Calendar },
  { label: "Decision Lab", href: "/decision-lab", icon: FlaskConical },
  { label: "Indoor Air", href: "/indoor-air", icon: Home },
  { label: "Impact", href: "/impact", icon: Leaf },
  { label: "Methodology", href: "/methodology", icon: FileText },
];

/**
 * Approved Minimalist Wind Mark (Image 1 reference)
 */
export function ApprovedVayuMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-7 stroke-current", className)}
      aria-hidden="true"
    >
      <path
        d="M2 11C7 5 13 5 19 9C23 11.5 27 10.5 30 8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 16C8.5 12 14.5 12 20 15C24 17 27.5 16 30 14"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface SidebarProps {
  onNavClick?: () => void;
  className?: string;
}

export function Sidebar({ onNavClick, className }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col justify-between h-full bg-[#FAFAF8] border-r border-[#D6D6D2] px-4 py-6 select-none",
        className
      )}
    >
      {/* Top: Brand & Navigation */}
      <div className="space-y-8">
        {/* Brand Logo matching Image 1 */}
        <Link
          to="/dashboard"
          onClick={onNavClick}
          className="flex items-center gap-2.5 px-3 py-1 group"
        >
          <ApprovedVayuMark className="text-[#111111]" />
          <span className="text-xl font-bold tracking-tight text-[#111111]">
            VayuVerse
          </span>
        </Link>

        {/* Navigation list */}
        <nav className="space-y-1.5" aria-label="Sidebar Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#D1EB8F] text-[#111111] font-semibold shadow-xs"
                    : "text-[#111111]/80 hover:text-[#111111] hover:bg-[#EDF6D5]/60"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "stroke-[2.2]" : "stroke-[1.75]")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Subtle Brand Descriptor matching Image 1 */}
      <div className="px-4 pt-6 space-y-2">
        <div className="flex flex-col gap-0.5">
          <div className="w-4 h-[2px] bg-[#111111]/70 mb-1" />
          <div className="w-4 h-[2px] bg-[#111111]/70" />
        </div>
        <div className="text-[10px] font-semibold tracking-wider uppercase text-[#626762] leading-tight">
          Personal
          <br />
          Air-Quality
          <br />
          Navigator
        </div>
      </div>
    </aside>
  );
}
