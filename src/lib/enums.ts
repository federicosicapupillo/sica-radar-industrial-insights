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

export const OCCUPANT_CONTACT_STATUS = [
  { value: "da_chiamare", label: "Da chiamare", tone: "warning" },
  { value: "chiamato", label: "Chiamato", tone: "info" },
  { value: "non_risponde", label: "Non risponde", tone: "muted" },
  { value: "numero_errato", label: "Numero errato", tone: "destructive" },
  { value: "sono_proprietari", label: "Sono proprietari", tone: "success" },
  { value: "sono_affittuari", label: "Sono affittuari", tone: "info" },
  { value: "proprieta_indicata", label: "Proprietà indicata", tone: "success" },
  { value: "proprieta_non_indicata", label: "Proprietà non indicata", tone: "warning" },
  { value: "richiamare", label: "Richiamare", tone: "warning" },
  { value: "non_interessati", label: "Non interessati", tone: "muted" },
  { value: "interessati", label: "Interessati a parlare", tone: "success" },
  { value: "da_verificare", label: "Da verificare", tone: "muted" },
] as const;

export const OCCUPANT_CONTACT_SOURCE = [
  { value: "google_maps", label: "Google Maps" },
  { value: "sito_web", label: "Sito web aziendale" },
  { value: "cartello", label: "Cartello / insegna" },
  { value: "passaparola", label: "Passaparola" },
  { value: "telefonata", label: "Telefonata" },
  { value: "sopralluogo", label: "Sopralluogo" },
  { value: "manuale", label: "Inserimento manuale" },
  { value: "altro", label: "Altro" },
] as const;

export const OCCUPANT_CONTACT_CONFIDENCE = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "bassa", label: "Bassa" },
  { value: "da_verificare", label: "Da verificare" },
] as const;

export const CALL_OUTCOMES = [
  { value: "sono_proprietari", label: "Sono proprietari" },
  { value: "affittuari_con_contatto", label: "Affittuari — hanno dato contatto proprietà" },
  { value: "affittuari_senza_contatto", label: "Affittuari — non hanno dato contatto" },
  { value: "inviare_email", label: "Chiedono di inviare email" },
  { value: "non_interessati", label: "Non interessati" },
  { value: "richiamare", label: "Richiamare più avanti" },
  { value: "non_risponde", label: "Non risponde" },
  { value: "numero_errato", label: "Numero errato" },
  { value: "altro", label: "Altro" },
] as const;

export const CALL_SCRIPT_TEXT = `Buongiorno, sono Federico Sica di Sica Immobiliare.
Mi occupo di immobili industriali nella zona.
Vi contatto perché stiamo facendo una verifica su alcuni capannoni compatibili con richieste di aziende nostre clienti.
Volevo capire se voi siete proprietari dell'immobile oppure se siete in affitto.
Nel caso foste in affitto, sapete indicarmi chi gestisce la proprietà o a chi posso rivolgermi?`;

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
