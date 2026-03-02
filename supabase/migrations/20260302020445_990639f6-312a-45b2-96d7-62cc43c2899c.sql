
-- Drop existing foreign keys and re-add with CASCADE
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_page_id_fkey;
ALTER TABLE public.services ADD CONSTRAINT services_status_page_id_fkey 
  FOREIGN KEY (status_page_id) REFERENCES public.status_pages(id) ON DELETE CASCADE;

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_status_page_id_fkey;
ALTER TABLE public.incidents ADD CONSTRAINT incidents_status_page_id_fkey 
  FOREIGN KEY (status_page_id) REFERENCES public.status_pages(id) ON DELETE CASCADE;

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_status_page_id_fkey;
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_status_page_id_fkey 
  FOREIGN KEY (status_page_id) REFERENCES public.status_pages(id) ON DELETE CASCADE;

-- Also add CASCADE for incident child tables
ALTER TABLE public.incident_services DROP CONSTRAINT IF EXISTS incident_services_incident_id_fkey;
ALTER TABLE public.incident_services ADD CONSTRAINT incident_services_incident_id_fkey 
  FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;

ALTER TABLE public.incident_services DROP CONSTRAINT IF EXISTS incident_services_service_id_fkey;
ALTER TABLE public.incident_services ADD CONSTRAINT incident_services_service_id_fkey 
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

ALTER TABLE public.incident_updates DROP CONSTRAINT IF EXISTS incident_updates_incident_id_fkey;
ALTER TABLE public.incident_updates ADD CONSTRAINT incident_updates_incident_id_fkey 
  FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;
