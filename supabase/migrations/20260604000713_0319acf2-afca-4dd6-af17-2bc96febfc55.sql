
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  property_type text,
  opportunity_status text NOT NULL DEFAULT 'da_verificare',
  priority text NOT NULL DEFAULT 'media',
  region text,
  province text,
  city text,
  address text,
  latitude double precision,
  longitude double precision,
  covered_sqm numeric,
  yard_sqm numeric,
  internal_height numeric,
  spans_count integer,
  has_offices boolean,
  office_sqm numeric,
  truck_access boolean,
  loading_doors integer,
  has_crane boolean,
  power_available text,
  property_condition text,
  intended_use text,
  near_highway boolean,
  near_port boolean,
  near_industrial_area boolean,
  already_for_sale text DEFAULT 'non_verificato',
  asking_price numeric,
  rent_price numeric,
  source_type text,
  source_url text,
  google_maps_url text,
  google_earth_url text,
  occupying_company text,
  possible_owner text,
  contact_name text,
  phone text,
  email text,
  commercial_notes text,
  next_action text,
  next_action_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO anon, authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access opportunities" ON public.opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_opportunities_updated BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  company text,
  role text,
  phone text,
  email text,
  status text DEFAULT 'da_contattare',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO anon, authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_opp_status ON public.opportunities(opportunity_status);
CREATE INDEX idx_opp_priority ON public.opportunities(priority);
CREATE INDEX idx_opp_province ON public.opportunities(province);
CREATE INDEX idx_contacts_opp ON public.contacts(opportunity_id);
CREATE INDEX idx_logs_opp ON public.activity_logs(opportunity_id);
