import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

const SERVICE_GROUPS = [
  { category: 'Cloud Infrastructure', services: [
    { name: 'Compute Engine', description: 'Virtual machines and auto-scaling compute' },
    { name: 'Load Balancer', description: 'Traffic distribution across instances' },
    { name: 'Object Storage', description: 'Scalable file and blob storage' },
    { name: 'DNS Management', description: 'Domain routing and resolution' },
    { name: 'CDN', description: 'Global content delivery network' },
  ]},
  { category: 'Communication', services: [
    { name: 'Email Delivery', description: 'Transactional and bulk email sending' },
    { name: 'SMS Gateway', description: 'Text message delivery worldwide' },
    { name: 'Push Notifications', description: 'Mobile and web push alerts' },
    { name: 'Webhooks', description: 'Event-driven HTTP callbacks' },
    { name: 'Chat Service', description: 'Real-time messaging infrastructure' },
  ]},
  { category: 'Data Platform', services: [
    { name: 'PostgreSQL Cluster', description: 'Primary relational database' },
    { name: 'Redis Cache', description: 'In-memory key-value caching layer' },
    { name: 'Search Index', description: 'Full-text search and indexing' },
    { name: 'Data Pipeline', description: 'ETL and streaming data processing' },
    { name: 'Analytics Engine', description: 'Aggregation and reporting queries' },
  ]},
  { category: 'Developer Tools', services: [
    { name: 'CI/CD Pipeline', description: 'Automated build, test, and deploy' },
    { name: 'Container Registry', description: 'Docker image storage and distribution' },
    { name: 'API Gateway', description: 'Request routing, rate limiting, auth' },
    { name: 'Log Aggregation', description: 'Centralized log collection and search' },
    { name: 'Error Tracking', description: 'Exception capture and alerting' },
  ]},
  { category: 'Identity & Security', services: [
    { name: 'Authentication', description: 'User login and session management' },
    { name: 'SSO Provider', description: 'Single sign-on across applications' },
    { name: 'Certificate Manager', description: 'TLS/SSL certificate provisioning' },
    { name: 'Secrets Vault', description: 'Encrypted credential storage' },
    { name: 'Firewall', description: 'Network traffic filtering and rules' },
  ]},
  { category: 'Media Services', services: [
    { name: 'Image Processing', description: 'Resize, crop, and format conversion' },
    { name: 'Video Transcoding', description: 'Multi-format video encoding' },
    { name: 'Asset Storage', description: 'Media file hosting and retrieval' },
    { name: 'Streaming CDN', description: 'Low-latency video and audio delivery' },
    { name: 'Thumbnail Generator', description: 'Automatic preview image creation' },
  ]},
  { category: 'Payments', services: [
    { name: 'Payment Processing', description: 'Credit card and bank transfers' },
    { name: 'Subscription Billing', description: 'Recurring charge management' },
    { name: 'Invoice Service', description: 'Invoice generation and delivery' },
    { name: 'Fraud Detection', description: 'Transaction risk scoring' },
    { name: 'Payout Engine', description: 'Merchant and vendor disbursements' },
  ]},
  { category: 'Monitoring', services: [
    { name: 'Uptime Checker', description: 'Periodic endpoint health probes' },
    { name: 'Metrics Collector', description: 'System and app metric ingestion' },
    { name: 'Alerting Service', description: 'Threshold-based alert routing' },
    { name: 'Status Dashboard', description: 'Public-facing system status page' },
    { name: 'Incident Manager', description: 'Incident lifecycle coordination' },
  ]},
];

export default function AdminTesting() {
  const { statusPageId } = useOutletContext<{ statusPageId: string }>();
  const qc = useQueryClient();

  const addServices = async () => {
    try {
      const group = SERVICE_GROUPS[Math.floor(Math.random() * SERVICE_GROUPS.length)];
      const { data: existing } = await supabase.from('services').select('display_order').eq('status_page_id', statusPageId).order('display_order', { ascending: false }).limit(1);
      const maxOrder = existing?.[0]?.display_order ?? 0;
      const rows = group.services.map((svc, i) => ({
        name: svc.name,
        description: svc.description,
        category: group.category,
        display_order: maxOrder + i + 1,
        is_test: true,
        chart_enabled: false,
        status_page_id: statusPageId,
      }));
      const { error } = await supabase.from('services').insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['services', statusPageId] });
      toast.success(`Added "${group.category}" group with ${group.services.length} services`);
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
        .eq('status_page_id', statusPageId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (fetchErr) throw fetchErr;
      if (!data?.length) { toast.info('No test services to remove'); return; }
      const ids = data.map((s: any) => s.id);
      for (const id of ids) {
        await supabase.from('incident_services').delete().eq('service_id', id);
      }
      const { error } = await supabase.from('services').delete().in('id', ids);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['services', statusPageId] });
      qc.invalidateQueries({ queryKey: ['incidents', statusPageId] });
      toast.success(`Removed ${ids.length} test service(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addIncident = async () => {
    try {
      const { data: services } = await supabase.from('services').select('id').eq('status_page_id', statusPageId).order('display_order').limit(1);
      if (!services?.length) { toast.error('No services exist'); return; }
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({ title: 'Test incident — ' + new Date().toLocaleTimeString(), impact: 'minor', status_page_id: statusPageId })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('incident_services').insert({ incident_id: incident.id, service_id: services[0].id });
      await supabase.from('incident_updates').insert({ incident_id: incident.id, status: 'investigating', message: 'Investigating the issue.' });
      qc.invalidateQueries({ queryKey: ['incidents', statusPageId] });
      qc.invalidateQueries({ queryKey: ['services', statusPageId] });
      toast.success('Created test incident');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const resolveAll = async () => {
    try {
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, incident_updates(status, created_at)')
        .eq('status_page_id', statusPageId);
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
      qc.invalidateQueries({ queryKey: ['incidents', statusPageId] });
      qc.invalidateQueries({ queryKey: ['services', statusPageId] });
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
        .eq('status_page_id', statusPageId)
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
          if (sorted.length > 1) {
            await supabase.from('incident_updates').delete().eq('id', latest.id);
          }
          await supabase.from('incidents').update({ resolved_at: null }).eq('id', inc.id);
          count++;
        }
      }
      qc.invalidateQueries({ queryKey: ['incidents', statusPageId] });
      qc.invalidateQueries({ queryKey: ['services', statusPageId] });
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
