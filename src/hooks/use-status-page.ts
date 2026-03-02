import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function useStatusPage() {
  const { slug } = useParams<{ slug: string }>();

  const query = useQuery({
    queryKey: ['status-page', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      const { data, error } = await supabase
        .from('status_pages')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  return {
    ...query,
    statusPageId: query.data?.id as string | undefined,
    slug,
  };
}
