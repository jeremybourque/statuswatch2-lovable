
-- Create status_pages table
CREATE TABLE public.status_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.status_pages FOR SELECT USING (true);
CREATE POLICY "Public write access" ON public.status_pages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.status_pages FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.status_pages FOR DELETE USING (true);

-- Insert default status page
INSERT INTO public.status_pages (name, slug, description) VALUES ('StatusWatch', 'default', 'Main status page');
