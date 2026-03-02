import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

const TEST_SERVICE_NAMES = ['Test Alpha', 'Test Beta', 'Test Gamma', 'Test Delta', 'Test Epsilon'];

export default function AdminTesting() {
  const qc = useQueryClient();

  const addServices = async () => {
    try {
      const { data: existing } = await supabase.from('services').select('display_order').order('display_order', { ascending: false }).limit(1);
      const maxOrder = existing?.[0]?.display_order ?? 0;
      const rows = TEST_SERVICE_NAMES.map((name, i) => ({
        name,
        category: 'Test',
        display_order: maxOrder + i + 1,
        is_test: true,
        chart_enabled: false,
      }));
      const { error } = await supabase.from('services').insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Added 5 test services');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeServices = async () => {
    try {
      const { data, error: fetchErr } = await (supabase
        .from('services')
        .select('id') as any)
        .eq('is_test', true)
        .order('created_at', { ascending: false })
        .limit(5);
      if (fetchErr) throw fetchErr;
      if (!data?.length) { toast.info('No test services to remove'); return; }
      const ids = data.map(s => s.id);
      // Remove incident_services links first
      for (const id of ids) {
        await supabase.from('incident_services').delete().eq('service_id', id);
      }
      const { error } = await supabase.from('services').delete().in('id', ids);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['services'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(`Removed ${ids.length} test service(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addIncident = async () => {
    try {
      const { data: services } = await supabase.from('services').select('id').order('display_order').limit(1);
      if (!services?.length) { toast.error('No services exist'); return; }
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({ title: 'Test incident — ' + new Date().toLocaleTimeString(), impact: 'minor' })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('incident_services').insert({ incident_id: incident.id, service_id: services[0].id });
      await supabase.from('incident_updates').insert({ incident_id: incident.id, status: 'investigating', message: 'Investigating the issue.' });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Created test incident');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const resolveAll = async () => {
    try {
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, incident_updates(status, created_at)');
      if (!incidents) return;
      const active = incidents.filter(inc => {
        const sorted = [...(inc.incident_updates || [])].sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return sorted.length === 0 || sorted[0].status !== 'resolved';
      });
      if (!active.length) { toast.info('No active incidents'); return; }
      for (const inc of active) {
        await supabase.from('incident_updates').insert({ incident_id: inc.id, status: 'resolved', message: 'Resolved via testing tool.' });
        await supabase.from('incidents').update({ resolved_at: new Date().toISOString() }).eq('id', inc.id);
      }
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success(`Resolved ${active.length} incident(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const reopenRecent = async () => {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, incident_updates(id, status, created_at)')
        .gte('created_at', threeDaysAgo)
        .not('resolved_at', 'is', null);
      if (!incidents?.length) { toast.info('No recently resolved incidents'); return; }
      let count = 0;
      for (const inc of incidents) {
        const sorted = [...(inc.incident_updates || [])].sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latest = sorted[0];
        if (latest?.status === 'resolved') {
          // Only delete if there's more than one update
          if (sorted.length > 1) {
            await supabase.from('incident_updates').delete().eq('id', latest.id);
          }
          await supabase.from('incidents').update({ resolved_at: null }).eq('id', inc.id);
          count++;
        }
      }
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success(`Reopened ${count} incident(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const actions = [
    { label: 'Add Services', icon: Plus, desc: 'Add 5 test services', onClick: addServices },
    { label: 'Remove Services', icon: Trash2, desc: 'Remove last 5 test services', onClick: removeServices },
    { label: 'Add Incident', icon: AlertTriangle, desc: 'Create a new active incident', onClick: addIncident },
    { label: 'Resolve All', icon: CheckCircle, desc: 'Resolve all open incidents', onClick: resolveAll },
    { label: 'Reopen Recent', icon: RotateCcw, desc: 'Reopen resolved incidents created in past 3 days', onClick: reopenRecent },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Testing</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(a => (
          <Button key={a.label} variant="outline" className="h-auto flex-col items-start gap-1 p-4 text-left" onClick={a.onClick}>
            <span className="flex items-center gap-2 font-medium"><a.icon className="h-4 w-4" />{a.label}</span>
            <span className="text-xs text-muted-foreground">{a.desc}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
