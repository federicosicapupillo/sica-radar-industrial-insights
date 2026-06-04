export type CompatStatus = "compatibile" | "parziale" | "non_compatibile" | "da_verificare";

export function isFromMisuratore(o: {
  measurement_source?: string | null;
  compatibility_status?: string | null;
  last_measured_at?: string | null;
}): boolean {
  return !!(o.measurement_source || o.compatibility_status || o.last_measured_at);
}

export function compatStatusFromScore(score: number | null | undefined): CompatStatus {
  if (score == null) return "da_verificare";
  if (score >= 80) return "compatibile";
  if (score >= 50) return "parziale";
  return "non_compatibile";
}

export const COMPAT_LABEL: Record<CompatStatus, string> = {
  compatibile: "Compatibile",
  parziale: "Parzialmente compatibile",
  non_compatibile: "Non compatibile",
  da_verificare: "Da verificare",
};

export const COMPAT_CLS: Record<CompatStatus, string> = {
  compatibile: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  parziale: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  non_compatibile: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400",
  da_verificare: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
};

export const MEASUREMENT_SOURCE_LABELS: Record<string, string> = {
  google_earth_manual: "Google Earth (manuale)",
  google_maps_manual: "Google Maps (manuale)",
  rilievo_posto: "Rilievo sul posto",
  planimetria: "Planimetria",
  catasto: "Catasto / documento",
  altro: "Altro",
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
  da_verificare: "Da verificare",
};

/** Format a value as "Non inserito" / "Da verificare" / value+suffix. */
export function fmtOrMissing(
  v: number | string | null | undefined,
  opts: { suffix?: string; missingLabel?: string } = {},
): string {
  const { suffix = "", missingLabel = "Non inserito" } = opts;
  if (v === null || v === undefined || v === "") return missingLabel;
  if (typeof v === "number") return `${v.toLocaleString("it-IT")}${suffix}`;
  return `${v}${suffix}`;
}
