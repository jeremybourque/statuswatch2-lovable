import { useIncidents } from '@/hooks/use-incidents';
import { useServices } from '@/hooks/use-services';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { useStatusPage } from '@/hooks/use-status-page';
import { incidentStatusConfig } from '@/lib/status-helpers';
import type { IncidentStatus } from '@/lib/status-helpers';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChevronDown, Activity, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subMonths, startOfMonth } from 'date-fns';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const impactToServiceStatus: Record<string, { label: string; color: string }> = {
  none: { label: 'No Impact', color: 'bg-muted text-muted-foreground' },
  minor: { label: 'Degraded Performance', color: 'bg-status-degraded/20 text-status-degraded' },
  major: { label: 'Partial Outage', color: 'bg-status-partial-outage/20 text-status-partial-outage' },
  critical: { label: 'Major Outage', color: 'bg-status-major-outage/20 text-status-major-outage' },
};

const IncidentHistory = () => {
  const { statusPageId, slug } = useStatusPage();
  const backLink = slug ? `/${slug}` : '/';
  const { data: incidents = [] } = useIncidents(statusPageId);
  const { data: services = [] } = useServices(statusPageId);
  const { data: settings } = useSiteSettings(statusPageId);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const getDerivedStatus = (incident: any) => {
    const updates = (incident.incident_updates || []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return updates.length > 0 ? updates[0].status : incident.status;
  };

  const resolvedIncidents = incidents.filter(i => getDerivedStatus(i) === 'resolved');
  const [monthsToShow, setMonthsToShow] = useState(6);

  const grouped = resolvedIncidents.reduce<Record<string, typeof resolvedIncidents>>((acc, incident) => {
    const key = format(new Date(incident.created_at), 'MMMM yyyy');
    if (!acc[key]) acc[key] = [];
    acc[key].push(incident);
    return acc;
  }, {});

  const currentMonth = format(new Date(), 'MMMM yyyy');
  const months: string[] = [];
  for (let i = 0; i < monthsToShow; i++) {
    const d = startOfMonth(subMonths(new Date(), i));
    const label = format(d, 'MMMM yyyy');
    if (label === currentMonth && !(grouped[label]?.length)) continue;
    months.push(label);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {settings?.page_title || 'StatusWatch'}
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Link to={backLink} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-xl font-semibold text-foreground">Incident History</h2>
        </div>

        <div className="space-y-8">
          {months.map(month => {
            const items = grouped[month] || [];
            return (
              <div key={month}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{month}</h3>
                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map(incident => (
                      <IncidentCard key={incident.id} incident={incident} services={services} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No incidents reported.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setMonthsToShow(prev => prev + 6)}
          >
            Show more
          </Button>
          <Link to={backLink} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Status Page
          </Link>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 StatusWatch</span>
        </div>
      </footer>
    </div>
  );
};

function IncidentCard({ incident, services = [] }: { incident: any; services?: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const updates = (incident.incident_updates || []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestStatus = updates.length > 0 ? updates[0].status : incident.status;
  const affectedServiceIds = (incident.incident_services || []).map((s: any) => s.service_id);
  const affectedServices = services.filter(s => affectedServiceIds.includes(s.id));
  const impactCfg = impactToServiceStatus[incident.impact] || impactToServiceStatus.none;

  const updateStatusColor: Record<string, string> = {
    investigating: 'text-status-major-outage',
    identified: 'text-status-partial-outage',
    monitoring: 'text-status-degraded',
    resolved: 'text-status-operational',
  };

  return (
    <div
      className={`border border-border rounded-lg bg-card overflow-hidden ${!expanded ? 'hover:bg-accent/50 transition-colors cursor-pointer' : ''}`}
      onClick={!expanded ? () => setExpanded(true) : undefined}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className={`w-full flex items-start justify-between p-4 text-left ${expanded ? 'hover:bg-accent/50 transition-colors cursor-pointer' : ''}`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-1.5 h-8 rounded-full shrink-0 mt-1.5 bg-status-operational" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground truncate">{incident.title}</h3>
            <div className="flex items-start gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground shrink-0">
                {format(new Date(incident.created_at), 'MMM d, yyyy · h:mm a')}
              </span>
              {affectedServices.length > 0 && (
                <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                  {affectedServices.map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="ml-5 border-l-2 border-border pl-6 space-y-4">
            {updates.map((update: any) => {
              const uColor = updateStatusColor[update.status as string] || 'text-muted-foreground';
              return (
                <div key={update.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-border border-2 border-card" />
                  <div>
                    <span className={`text-sm font-semibold capitalize ${uColor}`}>{update.status}</span>
                    <span className="text-sm text-muted-foreground ml-2">— {format(new Date(update.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-sm text-card-foreground mt-1 leading-relaxed">{update.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentHistory;
