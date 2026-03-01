ALTER TABLE public.services
  ADD COLUMN chart_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN chart_label text NOT NULL DEFAULT 'page load time',
  ADD COLUMN chart_data_format text NOT NULL DEFAULT '{value}s';