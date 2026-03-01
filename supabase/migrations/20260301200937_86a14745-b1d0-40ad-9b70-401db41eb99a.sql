
CREATE OR REPLACE FUNCTION public.prevent_last_update_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow deletion if the parent incident is also being deleted
  IF NOT EXISTS (SELECT 1 FROM public.incidents WHERE id = OLD.incident_id) THEN
    RETURN OLD;
  END IF;
  IF (SELECT count(*) FROM public.incident_updates WHERE incident_id = OLD.incident_id) <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last update of an incident. Delete the incident instead.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;
