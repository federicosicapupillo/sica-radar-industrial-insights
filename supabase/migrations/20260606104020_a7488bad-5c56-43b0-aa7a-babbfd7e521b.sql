CREATE TABLE IF NOT EXISTS public.radar_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_name text,
  latitude double precision,
  longitude double precision,
  radius_km numeric,
  target_covered_sqm numeric,
  tolerance_percent numeric,
  min_covered_sqm numeric,
  max_covered_sqm numeric,
  source_type text DEFAULT 'OpenStreetMap/Overpass',
  endpoint_used text,
  response_time_ms integer,
  raw_results_count integer,
  compatible_results_count integer,
  search_status text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.radar_searches TO anon, authenticated;
GRANT ALL ON public.radar_searches TO service_role;

ALTER TABLE public.radar_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open access radar_searches" ON public.radar_searches FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_radar_searches_updated_at
  BEFORE UPDATE ON public.radar_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_radar_searches_created_at ON public.radar_searches(created_at DESC);