import { Ruler } from "lucide-react";
import {
  COMPAT_CLS,
  COMPAT_LABEL,
  compatStatusFromScore,
  type CompatStatus,
} from "@/lib/compatibility";

export function CompatibilityBadge({
  score,
  status,
  size = "sm",
  showLabel = true,
}: {
  score?: number | null;
  status?: string | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const s: CompatStatus =
    (status as CompatStatus | undefined) && status! in COMPAT_LABEL
      ? (status as CompatStatus)
      : compatStatusFromScore(score ?? null);
  const cls = COMPAT_CLS[s];
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      title={COMPAT_LABEL[s]}
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${padding} ${cls}`}
    >
      {score != null ? `${score}%` : "—"}
      {showLabel && <span className="hidden sm:inline opacity-80">· {COMPAT_LABEL[s]}</span>}
    </span>
  );
}

export function MisuratoreTag({ size = "sm" }: { size?: "sm" | "md" }) {
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      title="Opportunità creata dal Misuratore capannoni"
      className={`inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 text-primary font-medium ${padding}`}
    >
      <Ruler className="w-3 h-3" /> Da Misuratore
    </span>
  );
}
