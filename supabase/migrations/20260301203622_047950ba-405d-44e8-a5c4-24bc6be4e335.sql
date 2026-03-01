
-- Trigger: prevent deleting the last service link from an incident
CREATE OR REPLACE FUNCTION public.prevent_last_incident_service_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow if the parent incident is being deleted
  IF NOT EXISTS (SELECT 1 FROM public.incidents WHERE id = OLD.incident_id) THEN
    RETURN OLD;
  END IF;
  IF (SELECT count(*) FROM public.incident_services WHERE incident_id = OLD.incident_id) <= 1 THEN
    RAISE EXCEPTION 'Each incident must be associated with at least one service.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_last_incident_service_delete
BEFORE DELETE ON public.incident_services
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_incident_service_delete();

-- Trigger: ensure at least one service is linked after an incident is created
-- Uses a deferred constraint trigger so inserts into incident_services can happen in the same transaction
CREATE OR REPLACE FUNCTION public.ensure_incident_has_service()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.incident_services WHERE incident_id = NEW.id) THEN
    RAISE EXCEPTION 'Each incident must be associated with at least one service.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_ensure_incident_has_service
AFTER INSERT ON public.incidents
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.ensure_incident_has_service();
