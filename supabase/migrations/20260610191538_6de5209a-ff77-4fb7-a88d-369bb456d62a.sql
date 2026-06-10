ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS crane_capacity_tons numeric,
  ADD COLUMN IF NOT EXISTS highway_distance_km numeric,
  ADD COLUMN IF NOT EXISTS port_distance_km numeric,
  ADD COLUMN IF NOT EXISTS logistics_hub_distance_km numeric;

CREATE INDEX IF NOT EXISTS idx_opportunities_city ON public.opportunities (city);
CREATE INDEX IF NOT EXISTS idx_opportunities_province ON public.opportunities (province);
CREATE INDEX IF NOT EXISTS idx_opportunities_covered_sqm ON public.opportunities (covered_sqm);
CREATE INDEX IF NOT EXISTS idx_opportunities_asking_price ON public.opportunities (asking_price);
CREATE INDEX IF NOT EXISTS idx_opportunities_rent_price ON public.opportunities (rent_price);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities (opportunity_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_industrial_area ON public.opportunities (industrial_area);