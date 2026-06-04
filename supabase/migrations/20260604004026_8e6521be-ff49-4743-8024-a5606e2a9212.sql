
-- New columns on opportunities
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS search_name text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS industrial_area text,
  ADD COLUMN IF NOT EXISTS truck_access_status text,
  ADD COLUMN IF NOT EXISTS offices_status text,
  ADD COLUMN IF NOT EXISTS estimated_height numeric,
  ADD COLUMN IF NOT EXISTS visual_notes text,
  ADD COLUMN IF NOT EXISTS uploaded_file_url text,
  ADD COLUMN IF NOT EXISTS geo_feature_type text,
  ADD COLUMN IF NOT EXISTS geo_area_sqm numeric,
  ADD COLUMN IF NOT EXISTS measurement_draft_id uuid;

-- Drafts table
CREATE TABLE IF NOT EXISTS public.measurement_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_name text,
  client_name text,
  city text,
  province text,
  industrial_area text,
  target_covered_sqm numeric,
  target_yard_sqm numeric,
  target_height numeric,
  required_truck_access boolean,
  near_port_required boolean,
  near_highway_required boolean,
  measured_covered_sqm numeric,
  measured_yard_sqm numeric,
  measured_length numeric,
  measured_width numeric,
  estimated_height numeric,
  truck_access_status text,
  offices_status text,
  measurement_source text,
  measurement_confidence text,
  google_maps_url text,
  google_earth_url text,
  address text,
  latitude double precision,
  longitude double precision,
  visual_notes text,
  measurement_notes text,
  target_notes text,
  uploaded_file_url text,
  uploaded_file_name text,
  geojson_data jsonb,
  geo_feature_type text,
  geo_area_sqm numeric,
  compatibility_score integer,
  compatibility_status text,
  missing_data jsonb,
  suggested_next_action text,
  converted_to_opportunity boolean NOT NULL DEFAULT false,
  opportunity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurement_drafts TO anon, authenticated;
GRANT ALL ON public.measurement_drafts TO service_role;

ALTER TABLE public.measurement_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open access measurement_drafts" ON public.measurement_drafts;
CREATE POLICY "Open access measurement_drafts" ON public.measurement_drafts
  FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_measurement_drafts_updated_at ON public.measurement_drafts;
CREATE TRIGGER set_measurement_drafts_updated_at
  BEFORE UPDATE ON public.measurement_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
