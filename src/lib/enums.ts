export const PROPERTY_TYPES = [
  { value: "capannone_industriale", label: "Capannone industriale" },
  { value: "logistico", label: "Logistico" },
  { value: "artigianale", label: "Artigianale" },
  { value: "commerciale", label: "Commerciale" },
  { value: "navale", label: "Navale" },
  { value: "area_edificabile", label: "Area edificabile / produttiva" },
  { value: "magazzino", label: "Magazzino" },
  { value: "altro", label: "Altro" },
] as const;

export const OPPORTUNITY_STATUS = [
  { value: "da_verificare", label: "Da verificare", tone: "muted" },
  { value: "interessante", label: "Interessante", tone: "info" },
  { value: "contatto_trovato", label: "Contatto trovato", tone: "info" },
  { value: "proprieta_da_identificare", label: "Proprietà da identificare", tone: "warning" },
  { value: "contattato", label: "Contattato", tone: "info" },
  { value: "in_trattativa", label: "In trattativa", tone: "success" },
  { value: "non_interessato", label: "Non interessato", tone: "muted" },
  { value: "gia_in_vendita", label: "Già in vendita", tone: "warning" },
  { value: "non_adatto", label: "Non adatto", tone: "muted" },
  { value: "acquisito", label: "Acquisito", tone: "success" },
  { value: "archiviato", label: "Archiviato", tone: "muted" },
] as const;

export const PRIORITIES = [
  { value: "bassa", label: "Bassa", tone: "muted" },
  { value: "media", label: "Media", tone: "info" },
  { value: "alta", label: "Alta", tone: "warning" },
  { value: "urgente", label: "Urgente", tone: "destructive" },
] as const;

export const ALREADY_FOR_SALE = [
  { value: "si", label: "Sì" },
  { value: "no", label: "No" },
  { value: "non_verificato", label: "Non verificato" },
] as const;

export const PROPERTY_CONDITION = [
  { value: "ottimo", label: "Ottimo" },
  { value: "buono", label: "Buono" },
  { value: "da_ristrutturare", label: "Da ristrutturare" },
  { value: "da_verificare", label: "Da verificare" },
] as const;

export const SOURCE_TYPES = [
  { value: "manuale", label: "Inserimento manuale" },
  { value: "google_maps", label: "Google Maps" },
  { value: "google_earth", label: "Google Earth" },
  { value: "portale", label: "Portale immobiliare" },
  { value: "segnalazione", label: "Segnalazione" },
  { value: "passaparola", label: "Passaparola" },
  { value: "sopralluogo", label: "Sopralluogo" },
  { value: "altro", label: "Altro" },
] as const;

export const CONTACT_STATUS = [
  { value: "da_contattare", label: "Da contattare" },
  { value: "contattato", label: "Contattato" },
  { value: "non_risponde", label: "Non risponde" },
  { value: "interessato", label: "Interessato" },
  { value: "non_interessato", label: "Non interessato" },
  { value: "da_richiamare", label: "Da richiamare" },
] as const;

export function labelOf(list: ReadonlyArray<{ value: string; label: string }>, v?: string | null) {
  if (!v) return "—";
  return list.find((x) => x.value === v)?.label ?? v;
}

export function toneOf(
  list: ReadonlyArray<{ value: string; label: string; tone?: string }>,
  v?: string | null,
) {
  if (!v) return "muted";
  return list.find((x) => x.value === v)?.tone ?? "muted";
}
