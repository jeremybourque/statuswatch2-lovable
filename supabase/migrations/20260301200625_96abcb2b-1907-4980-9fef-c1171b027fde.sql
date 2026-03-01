
-- Prevent deleting the last update for an incident
CREATE OR REPLACE FUNCTION public.prevent_last_update_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.incident_updates WHERE incident_id = OLD.incident_id) <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last update of an incident. Delete the incident instead.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER prevent_last_incident_update_delete
BEFORE DELETE ON public.incident_updates
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_update_delete();
