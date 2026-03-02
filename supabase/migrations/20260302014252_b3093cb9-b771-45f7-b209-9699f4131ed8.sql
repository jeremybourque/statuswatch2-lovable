CREATE OR REPLACE FUNCTION public.create_incident_with_service(
  p_status_page_id uuid,
  p_service_id uuid,
  p_title text,
  p_impact text DEFAULT 'minor',
  p_status text DEFAULT 'investigating',
  p_message text DEFAULT 'Investigating the issue.'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_incident_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.services
    WHERE id = p_service_id
      AND status_page_id = p_status_page_id
  ) THEN
    RAISE EXCEPTION 'Selected service does not belong to this status page.';
  END IF;

  INSERT INTO public.incidents (title, impact, status, status_page_id)
  VALUES (p_title, p_impact, p_status, p_status_page_id)
  RETURNING id INTO v_incident_id;

  INSERT INTO public.incident_services (incident_id, service_id)
  VALUES (v_incident_id, p_service_id);

  INSERT INTO public.incident_updates (incident_id, status, message)
  VALUES (
    v_incident_id,
    p_status,
    COALESCE(NULLIF(trim(p_message), ''), 'Investigating the issue.')
  );

  RETURN v_incident_id;
END;
$$;