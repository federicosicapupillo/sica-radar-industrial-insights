
-- Add occupant + call columns to opportunities
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS occupant_company_name text,
  ADD COLUMN IF NOT EXISTS occupant_sign_name text,
  ADD COLUMN IF NOT EXISTS occupant_phone text,
  ADD COLUMN IF NOT EXISTS occupant_email text,
  ADD COLUMN IF NOT EXISTS occupant_website text,
  ADD COLUMN IF NOT EXISTS occupant_reference_name text,
  ADD COLUMN IF NOT EXISTS occupant_reference_role text,
  ADD COLUMN IF NOT EXISTS occupant_contact_source text,
  ADD COLUMN IF NOT EXISTS occupant_contact_confidence text,
  ADD COLUMN IF NOT EXISTS occupant_contact_notes text,
  ADD COLUMN IF NOT EXISTS occupant_contact_status text DEFAULT 'da_chiamare',
  ADD COLUMN IF NOT EXISTS last_call_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS call_outcome text,
  ADD COLUMN IF NOT EXISTS person_spoken_to text,
  ADD COLUMN IF NOT EXISTS person_role text,
  ADD COLUMN IF NOT EXISTS is_owner_confirmed boolean,
  ADD COLUMN IF NOT EXISTS is_tenant_confirmed boolean,
  ADD COLUMN IF NOT EXISTS owner_contact_provided boolean,
  ADD COLUMN IF NOT EXISTS indicated_owner_name text,
  ADD COLUMN IF NOT EXISTS indicated_owner_phone text,
  ADD COLUMN IF NOT EXISTS indicated_owner_email text,
  ADD COLUMN IF NOT EXISTS call_notes text;

-- Create contact_attempts table
CREATE TABLE IF NOT EXISTS public.contact_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid,
  radar_candidate_id uuid,
  contact_type text,
  contact_date timestamp with time zone NOT NULL DEFAULT now(),
  contacted_company text,
  contacted_phone text,
  person_spoken_to text,
  person_role text,
  outcome text,
  is_owner_confirmed boolean,
  is_tenant_confirmed boolean,
  owner_contact_provided boolean,
  indicated_owner_name text,
  indicated_owner_phone text,
  indicated_owner_email text,
  notes text,
  next_action text,
  next_action_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_attempts TO authenticated, anon;
GRANT ALL ON public.contact_attempts TO service_role;

ALTER TABLE public.contact_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open access contact_attempts" ON public.contact_attempts;
CREATE POLICY "Open access contact_attempts" ON public.contact_attempts
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS contact_attempts_opp_idx ON public.contact_attempts(opportunity_id);

DROP TRIGGER IF EXISTS set_updated_at_contact_attempts ON public.contact_attempts;
CREATE TRIGGER set_updated_at_contact_attempts
  BEFORE UPDATE ON public.contact_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
