import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IncidentImpact, ServiceStatus } from '@/lib/status-helpers';

const impactToStatus: Record<string, ServiceStatus> = {
  critical: 'major_outage',
  major: 'partial_outage',
  minor: 'degraded',
  none: 'operational',
};

const statusSeverity: Record<ServiceStatus, number> = {
  operational: 0,
  degraded: 1,
  partial_outage: 2,
  major_outage: 3,
};

export function useServices(statusPageId?: string) {
  return useQuery({
    queryKey: ['services', statusPageId],
    queryFn: async () => {
      if (!statusPageId) return [];

      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('status_page_id', statusPageId)
        .order('display_order');
      if (error) throw error;

      const { data: allIncidents, error: incErr } = await supabase
        .from('incidents')
        .select('id, impact, incident_services(service_id), incident_updates(status, created_at)')
        .eq('status_page_id', statusPageId);
      if (incErr) throw incErr;

      const activeIncidents = (allIncidents || []).filter(incident => {
        const updates = (incident.incident_updates || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const derivedStatus = updates.length > 0 ? updates[0].status : 'investigating';
        return derivedStatus !== 'resolved';
      });

      const worstByService: Record<string, ServiceStatus> = {};
      for (const incident of activeIncidents || []) {
        const mapped = impactToStatus[incident.impact] || 'degraded';
        for (const link of incident.incident_services || []) {
          const current = worstByService[link.service_id] || 'operational';
          if (statusSeverity[mapped] > statusSeverity[current]) {
            worstByService[link.service_id] = mapped;
          }
        }
      }

      return (services || []).map(s => ({
        ...s,
        status: worstByService[s.id] || 'operational',
      }));
    },
    enabled: !!statusPageId,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: { name: string; description?: string; category: string; display_order: number; chart_enabled?: boolean; chart_label?: string; chart_data_format?: string; status_page_id: string }) => {
      const { data, error } = await supabase.from('services').insert(service).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['services', data.status_page_id] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; category?: string; display_order?: number; chart_enabled?: boolean; chart_label?: string; chart_data_format?: string }) => {
      const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['services', data.status_page_id] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await supabase.from('services').select('status_page_id').eq('id', id).single();
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      return data?.status_page_id;
    },
    onSuccess: (statusPageId) => {
      if (statusPageId) qc.invalidateQueries({ queryKey: ['services', statusPageId] });
    },
  });
}
