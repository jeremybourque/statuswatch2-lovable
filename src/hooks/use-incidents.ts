import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useIncidents(statusPageId?: string) {
  return useQuery({
    queryKey: ['incidents', statusPageId],
    queryFn: async () => {
      if (!statusPageId) return [];
      const { data, error } = await supabase
        .from('incidents')
        .select('*, incident_updates(*), incident_services(service_id)')
        .eq('status_page_id', statusPageId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!statusPageId,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; status: string; impact: string; service_ids: string[]; message: string; status_page_id: string }) => {
      if (!input.service_ids?.length) {
        throw new Error('Select at least one affected service');
      }

      const primaryServiceId = input.service_ids[0];
      const { data: incidentId, error: createErr } = await (supabase as any).rpc('create_incident_with_service', {
        p_status_page_id: input.status_page_id,
        p_service_id: primaryServiceId,
        p_title: input.title,
        p_impact: input.impact,
        p_status: input.status,
        p_message: input.message,
      });
      if (createErr) throw createErr;

      const createdIncidentId = incidentId as string | null;
      if (!createdIncidentId) throw new Error('Failed to create incident');

      const additionalServiceIds = input.service_ids.slice(1);
      if (additionalServiceIds.length > 0) {
        const { error: linkErr } = await supabase
          .from('incident_services')
          .insert(additionalServiceIds.map(service_id => ({ incident_id: createdIncidentId, service_id })));
        if (linkErr) throw linkErr;
      }

      const { data: incident, error: fetchErr } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', createdIncidentId)
        .single();
      if (fetchErr) throw fetchErr;

      return incident;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['incidents', data.status_page_id] }),
  });
}

export function useAddIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { incident_id: string; status: string; message: string; created_at?: string; status_page_id: string }) => {
      const insert: { incident_id: string; status: string; message: string; created_at?: string } = { incident_id: input.incident_id, status: input.status, message: input.message };
      if (input.created_at) insert.created_at = input.created_at;
      const { error: updateErr } = await supabase
        .from('incident_updates')
        .insert(insert);
      if (updateErr) throw updateErr;

      if (input.status === 'resolved') {
        const { error } = await supabase.from('incidents').update({ resolved_at: new Date().toISOString() }).eq('id', input.incident_id);
        if (error) throw error;
      }
      return input.status_page_id;
    },
    onSuccess: (statusPageId) => {
      qc.invalidateQueries({ queryKey: ['incidents', statusPageId] });
    },
  });
}

export function useUpdateIncidentImpact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, impact, status_page_id }: { id: string; impact: string; status_page_id: string }) => {
      const { error } = await supabase.from('incidents').update({ impact }).eq('id', id);
      if (error) throw error;
      return status_page_id;
    },
    onSuccess: (statusPageId) => {
      qc.invalidateQueries({ queryKey: ['incidents', statusPageId] });
      qc.invalidateQueries({ queryKey: ['services', statusPageId] });
    },
  });
}

export function useUpdateIncidentServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ incident_id, service_ids, status_page_id }: { incident_id: string; service_ids: string[]; status_page_id: string }) => {
      const { data: current, error: fetchErr } = await supabase
        .from('incident_services')
        .select('service_id')
        .eq('incident_id', incident_id);
      if (fetchErr) throw fetchErr;

      const currentIds = (current || []).map(c => c.service_id);
      const toDelete = currentIds.filter(id => !service_ids.includes(id));
      const toInsert = service_ids.filter(id => !currentIds.includes(id));

      for (const sid of toDelete) {
        const { error } = await supabase
          .from('incident_services')
          .delete()
          .eq('incident_id', incident_id)
          .eq('service_id', sid);
        if (error) throw error;
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('incident_services')
          .insert(toInsert.map(sid => ({ incident_id, service_id: sid })));
        if (insErr) throw insErr;
      }
      return status_page_id;
    },
    onSuccess: (statusPageId) => {
      qc.invalidateQueries({ queryKey: ['incidents', statusPageId] });
      qc.invalidateQueries({ queryKey: ['services', statusPageId] });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status_page_id }: { id: string; status_page_id: string }) => {
      await supabase.from('incident_services').delete().eq('incident_id', id);
      await supabase.from('incident_updates').delete().eq('incident_id', id);
      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) throw error;
      return status_page_id;
    },
    onSuccess: (statusPageId) => qc.invalidateQueries({ queryKey: ['incidents', statusPageId] }),
  });
}

export function useDeleteIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status_page_id }: { id: string; status_page_id: string }) => {
      const { error } = await supabase.from('incident_updates').delete().eq('id', id);
      if (error) throw error;
      return status_page_id;
    },
    onSuccess: (statusPageId) => qc.invalidateQueries({ queryKey: ['incidents', statusPageId] }),
  });
}

export function useUpdateIncidentTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, status_page_id }: { id: string; title: string; status_page_id: string }) => {
      const { error } = await supabase.from('incidents').update({ title }).eq('id', id);
      if (error) throw error;
      return status_page_id;
    },
    onSuccess: (statusPageId) => qc.invalidateQueries({ queryKey: ['incidents', statusPageId] }),
  });
}

export function useEditIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message, status, created_at, status_page_id }: { id: string; message: string; status: string; created_at?: string; status_page_id: string }) => {
      const update: Record<string, string> = { message, status };
      if (created_at) update.created_at = created_at;
      const { error } = await supabase.from('incident_updates').update(update).eq('id', id);
      if (error) throw error;
      return status_page_id;
    },
    onSuccess: (statusPageId) => qc.invalidateQueries({ queryKey: ['incidents', statusPageId] }),
  });
}

export function useUpdateIncidentTimestamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, created_at, status_page_id }: { id: string; created_at: string; status_page_id: string }) => {
      const { error } = await supabase.from('incidents').update({ created_at }).eq('id', id);
      if (error) throw error;
      return status_page_id;
    },
    onSuccess: (statusPageId) => qc.invalidateQueries({ queryKey: ['incidents', statusPageId] }),
  });
}
