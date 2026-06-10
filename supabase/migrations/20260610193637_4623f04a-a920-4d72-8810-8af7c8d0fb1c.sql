CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brain_id UUID,
  name TEXT,
  municipality TEXT,
  province TEXT,
  region TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  industrial_area TEXT,
  covered_sqm NUMERIC,
  yard_sqm NUMERIC,
  internal_height NUMERIC,
  loading_doors INTEGER,
  has_crane BOOLEAN DEFAULT false,
  intended_use TEXT,
  opportunity_status TEXT DEFAULT 'to_verify',
  asking_price NUMERIC,
  rent_price NUMERIC,
  commercial_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own warehouses"
  ON public.warehouses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_warehouses_user_id ON public.warehouses(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_brain_id ON public.warehouses(brain_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_province ON public.warehouses(province);
CREATE INDEX IF NOT EXISTS idx_warehouses_municipality ON public.warehouses(municipality);

CREATE TRIGGER warehouses_set_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();