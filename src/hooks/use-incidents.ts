import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useIncidents() {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*, incident_updates(*), incident_services(service_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; status: string; impact: string; service_ids: string[]; message: string }) => {
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({ title: input.title, status: input.status, impact: input.impact })
        .select()
        .single();
      if (error) throw error;

      if (input.service_ids.length > 0) {
        const { error: linkErr } = await supabase
          .from('incident_services')
          .insert(input.service_ids.map(sid => ({ incident_id: incident.id, service_id: sid })));
        if (linkErr) throw linkErr;
      }

      if (input.message) {
        const { error: updateErr } = await supabase
          .from('incident_updates')
          .insert({ incident_id: incident.id, status: input.status, message: input.message });
        if (updateErr) throw updateErr;
      }

      return incident;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useAddIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { incident_id: string; status: string; message: string }) => {
      const { error: updateErr } = await supabase
        .from('incident_updates')
        .insert({ incident_id: input.incident_id, status: input.status, message: input.message });
      if (updateErr) throw updateErr;

      if (input.status === 'resolved') {
        const { error } = await supabase.from('incidents').update({ resolved_at: new Date().toISOString() }).eq('id', input.incident_id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useUpdateIncidentImpact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, impact }: { id: string; impact: string }) => {
      const { error } = await supabase.from('incidents').update({ impact }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateIncidentServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ incident_id, service_ids }: { incident_id: string; service_ids: string[] }) => {
      // Get current links
      const { data: current, error: fetchErr } = await supabase
        .from('incident_services')
        .select('service_id')
        .eq('incident_id', incident_id);
      if (fetchErr) throw fetchErr;

      const currentIds = (current || []).map(c => c.service_id);
      const toDelete = currentIds.filter(id => !service_ids.includes(id));
      const toInsert = service_ids.filter(id => !currentIds.includes(id));

      // Delete removed links
      for (const sid of toDelete) {
        const { error } = await supabase
          .from('incident_services')
          .delete()
          .eq('incident_id', incident_id)
          .eq('service_id', sid);
        if (error) throw error;
      }

      // Insert new links
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('incident_services')
          .insert(toInsert.map(sid => ({ incident_id, service_id: sid })));
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first
      await supabase.from('incident_services').delete().eq('incident_id', id);
      await supabase.from('incident_updates').delete().eq('incident_id', id);
      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useDeleteIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incident_updates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useUpdateIncidentTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from('incidents').update({ title }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useEditIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message, status }: { id: string; message: string; status: string }) => {
      const { error } = await supabase.from('incident_updates').update({ message, status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}
