
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS data_quality text,
  ADD COLUMN IF NOT EXISTS commercial_interest text,
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS radar_source text,
  ADD COLUMN IF NOT EXISTS radar_metadata jsonb;

CREATE TABLE IF NOT EXISTS public.radar_discarded_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  osm_id text,
  osm_type text,
  result_hash text NOT NULL,
  title text,
  address text,
  lat numeric,
  lng numeric,
  building_type text,
  data_quality text,
  commercial_interest text,
  discard_reason text,
  discarded_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS radar_discarded_results_hash_uniq
  ON public.radar_discarded_results (result_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.radar_discarded_results TO anon, authenticated;
GRANT ALL ON public.radar_discarded_results TO service_role;

ALTER TABLE public.radar_discarded_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open access radar_discarded_results" ON public.radar_discarded_results;
CREATE POLICY "Open access radar_discarded_results"
  ON public.radar_discarded_results
  FOR ALL
  USING (true)
  WITH CHECK (true);
