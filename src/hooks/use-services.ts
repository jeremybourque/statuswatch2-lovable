import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IncidentImpact, ServiceStatus } from '@/lib/status-helpers';

// Maps incident impact to a service status severity
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

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      // Fetch services
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .order('display_order');
      if (error) throw error;

      // Fetch active (unresolved) incidents with their linked services
      const { data: activeIncidents, error: incErr } = await supabase
        .from('incidents')
        .select('id, impact, incident_services(service_id)')
        .neq('status', 'resolved');
      if (incErr) throw incErr;

      // Build a map: service_id → worst impact status
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

      // Override each service's status with the derived value
      return (services || []).map(s => ({
        ...s,
        status: worstByService[s.id] || 'operational',
      }));
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: { name: string; description?: string; category: string; display_order: number; chart_enabled?: boolean; chart_label?: string; chart_data_format?: string }) => {
      const { data, error } = await supabase.from('services').insert(service).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}
