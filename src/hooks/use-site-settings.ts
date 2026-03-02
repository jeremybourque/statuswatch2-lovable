import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSiteSettings(statusPageId?: string) {
  return useQuery({
    queryKey: ['site_settings', statusPageId],
    queryFn: async () => {
      if (!statusPageId) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('status_page_id', statusPageId);
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach(row => { map[row.key] = row.value; });
      return map;
    },
    enabled: !!statusPageId,
  });
}

export function useUpdateSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, status_page_id }: { key: string; value: string; status_page_id: string }) => {
      const { error } = await supabase.from('site_settings').upsert({ key, value, status_page_id });
      if (error) throw error;
      return status_page_id;
    },
    onSuccess: (statusPageId) => qc.invalidateQueries({ queryKey: ['site_settings', statusPageId] }),
  });
}
