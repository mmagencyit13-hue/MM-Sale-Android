-- Run once in Supabase SQL Editor. Existing CEO authorization is reused.
BEGIN;
CREATE TABLE IF NOT EXISTS public.erp619_graph_rates (
  kind text PRIMARY KEY CHECK (kind IN ('supplier','buyer')),
  rates jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.erp619_graph_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.erp619_graph_rates FROM anon, authenticated;
INSERT INTO public.erp619_graph_rates(kind,rates) VALUES
 ('supplier','[2,2.5,3]'),('buyer','[1]') ON CONFLICT(kind) DO NOTHING;
CREATE OR REPLACE FUNCTION public.erp619_commission_graph_master(
 p_token text, p_args jsonb DEFAULT '{}'::jsonb, p_rates jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE authorization jsonb; item text; numbers jsonb;
BEGIN
 -- Delegate session, CEO role and commission permission validation to the
 -- existing authenticated report function; never authorize by client flags.
 authorization := public.erp502_ceo(p_token, 'commission',
   coalesce(p_args,'{}'::jsonb) || jsonb_build_object('kind','supplier','offset',0));
 IF authorization->>'actor' IS NULL OR authorization->>'build' <> '502' THEN
   RAISE EXCEPTION 'CEO commission authorization required';
 END IF;
 IF p_rates IS NOT NULL THEN
   IF jsonb_typeof(p_rates) <> 'object' THEN RAISE EXCEPTION 'Invalid rate master'; END IF;
   FOREACH item IN ARRAY ARRAY['supplier','buyer'] LOOP
     numbers := p_rates->item;
     IF numbers IS NULL OR jsonb_typeof(numbers)<>'array' THEN RAISE EXCEPTION 'Both rate arrays required'; END IF;
     IF jsonb_array_length(numbers)<1 OR jsonb_array_length(numbers)>20 THEN RAISE EXCEPTION 'Enter 1 to 20 rates'; END IF;
     IF EXISTS(SELECT 1 FROM jsonb_array_elements(numbers) v WHERE jsonb_typeof(v)<>'number') THEN RAISE EXCEPTION 'Numeric rates required'; END IF;
     IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(numbers) v WHERE v::numeric<=0 OR v::numeric>100) THEN RAISE EXCEPTION 'Rates must be above 0 and up to 100'; END IF;
   END LOOP;
   FOREACH item IN ARRAY ARRAY['supplier','buyer'] LOOP
     UPDATE public.erp619_graph_rates SET rates=(SELECT jsonb_agg(n ORDER BY n) FROM (SELECT DISTINCT v::numeric n FROM jsonb_array_elements_text(p_rates->item) v) q),updated_at=now() WHERE kind=item;
   END LOOP;
 END IF;
 RETURN jsonb_build_object('actor',authorization->>'actor','rates',
   (SELECT jsonb_object_agg(kind,rates) FROM public.erp619_graph_rates));
END $$;
REVOKE ALL ON FUNCTION public.erp619_commission_graph_master(text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp619_commission_graph_master(text,jsonb,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
