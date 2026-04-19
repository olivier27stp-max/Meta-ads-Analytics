import * as React from "react";
import { Play, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Creative } from "@/types";

export function CreativePreview({
  creative,
  size = "md",
  className,
}: {
  creative: Creative;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    xs: "h-8 w-6",
    sm: "h-10 w-8",
    md: "h-16 w-12",
    lg: "h-full w-full",
  }[size];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md ring-1 ring-inset ring-border",
        dimensions,
        className,
      )}
      style={{
        background: `linear-gradient(140deg, ${creative.thumbnailColor} 0%, ${shade(creative.thumbnailColor, -20)} 100%)`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-white/90">
        {creative.mediaType === "video" ? (
          <Play className={cn(size === "lg" ? "h-8 w-8" : "h-3 w-3")} fill="currentColor" />
        ) : (
          <ImageIcon className={cn(size === "lg" ? "h-8 w-8" : "h-3 w-3")} />
        )}
      </div>
      {size === "lg" && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/80">
            <span>{creative.mediaType === "video" ? "Video" : "Image"}</span>
            <span className="rounded bg-black/40 px-1.5 py-0.5">9:16</span>
          </div>
        </>
      )}
    </div>
  );
}

// Simple hex shade helper
function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
