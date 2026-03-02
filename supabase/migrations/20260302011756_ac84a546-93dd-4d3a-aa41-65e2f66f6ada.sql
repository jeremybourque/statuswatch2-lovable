
-- Add status_page_id to services (nullable first)
ALTER TABLE public.services
ADD COLUMN status_page_id uuid REFERENCES public.status_pages(id) ON DELETE CASCADE;

-- Add status_page_id to incidents (nullable first)
ALTER TABLE public.incidents
ADD COLUMN status_page_id uuid REFERENCES public.status_pages(id) ON DELETE CASCADE;

-- Add status_page_id to site_settings (nullable first)
ALTER TABLE public.site_settings
ADD COLUMN status_page_id uuid REFERENCES public.status_pages(id) ON DELETE CASCADE;

-- Backfill all existing data to the default status page
UPDATE public.services SET status_page_id = '1a03f7f9-fe81-4e90-80aa-5117b982924a' WHERE status_page_id IS NULL;
UPDATE public.incidents SET status_page_id = '1a03f7f9-fe81-4e90-80aa-5117b982924a' WHERE status_page_id IS NULL;
UPDATE public.site_settings SET status_page_id = '1a03f7f9-fe81-4e90-80aa-5117b982924a' WHERE status_page_id IS NULL;

-- Make columns NOT NULL
ALTER TABLE public.services ALTER COLUMN status_page_id SET NOT NULL;
ALTER TABLE public.incidents ALTER COLUMN status_page_id SET NOT NULL;
ALTER TABLE public.site_settings ALTER COLUMN status_page_id SET NOT NULL;

-- Fix site_settings primary key to include status_page_id
ALTER TABLE public.site_settings DROP CONSTRAINT site_settings_pkey;
ALTER TABLE public.site_settings ADD PRIMARY KEY (key, status_page_id);

-- Add indexes
CREATE INDEX idx_services_status_page ON public.services(status_page_id);
CREATE INDEX idx_incidents_status_page ON public.incidents(status_page_id);
CREATE INDEX idx_site_settings_status_page ON public.site_settings(status_page_id);
