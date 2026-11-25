import React from "react";
import { AlertCircle, RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WindLines } from "@/components/ui/wind-lines";
import { cn } from "@/lib/cn";

/**
 * Standardized "Awaiting verified reading" state component.
 * As required: "The first dashboard state must say 'Awaiting verified reading'
 * until actual environmental information is available."
 */
export function AwaitingReadingState({
  locationName = "selected region",
  onSelectLocation,
  className,
}: {
  locationName?: string;
  onSelectLocation?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] p-8 sm:p-12 text-center",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 opacity-40">
        <WindLines variant="flow" className="h-14" />
      </div>

      <div className="relative z-10 mx-auto max-w-md flex flex-col items-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DCE2DC] bg-[#EAF1E9] px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#AFC8B5] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#526161]"></span>
          </span>
          <span className="text-[11px] font-medium tracking-wide uppercase text-[#182323]">
            Awaiting verified reading
          </span>
        </div>

        <h3 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-[#182323]">
          No live station synchronized
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-[#526161] leading-relaxed">
          OpenAQ v3 station observations for <span className="font-semibold text-[#182323]">{locationName}</span> have not been polled yet. VayuVerse strictly presents verified monitoring-station readings — never simulated numbers.
        </p>

        {onSelectLocation && (
          <div className="mt-6">
            <Button variant="softgreen" size="sm" onClick={onSelectLocation}>
              Select Indian Station
            </Button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-[#DCE2DC]/70 w-full text-[11px] text-[#526161]">
          <Badge variant="waiting">OpenAQ v3 Verified</Badge>
          <span>•</span>
          <span>CPCB Protocol</span>
          <span>•</span>
          <span>Zero Synthetic Data</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Empty State with Swiss aesthetic
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Radio,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[4px] border border-dashed border-[#DCE2DC] bg-[#FAFAF7] p-8 text-center",
        className
      )}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF1E9] text-[#182323] mb-3">
        <Icon className="h-5 w-5 stroke-[1.5]" />
      </div>
      <h4 className="text-sm font-semibold tracking-wide uppercase text-[#182323]">
        {title}
      </h4>
      <p className="mx-auto mt-1 max-w-sm text-xs text-[#526161] leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Reusable Error State
 */
export function ErrorState({
  title = "Connection Interrupted",
  message = "Could not synchronize with environmental stations. Please retry.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[4px] border border-[#B93838]/30 bg-[#FBF3F3] p-6 text-left">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[#B93838] mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-[#731E1E]">{title}</h4>
          <p className="mt-1 text-xs text-[#731E1E]/80">{message}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 border-[#B93838]/40 hover:bg-[#B93838]/10"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Retry Connection
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
