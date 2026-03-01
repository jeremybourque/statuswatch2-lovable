import { useServices } from '@/hooks/use-services';
import { useIncidents } from '@/hooks/use-incidents';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { getOverallStatus, getOverallBanner, statusConfig, incidentStatusConfig } from '@/lib/status-helpers';
import type { ServiceStatus, IncidentStatus, IncidentImpact } from '@/lib/status-helpers';

const impactToServiceStatus: Record<string, { label: string; color: string }> = {
  none: { label: 'No Impact', color: 'bg-muted text-muted-foreground' },
  minor: { label: statusConfig.degraded.label, color: 'bg-status-degraded/20 text-status-degraded' },
  major: { label: statusConfig.partial_outage.label, color: 'bg-status-partial-outage/20 text-status-partial-outage' },
  critical: { label: statusConfig.major_outage.label, color: 'bg-status-major-outage/20 text-status-major-outage' },
};
import { Badge } from '@/components/ui/badge';
import { ServiceFlipCard } from '@/components/ServiceFlipCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChevronDown, Activity, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

const Index = () => {
  const { data: services = [] } = useServices();
  const { data: incidents = [] } = useIncidents();
  const { data: settings } = useSiteSettings();

  const overallStatus = getOverallStatus(services.map(s => s.status as ServiceStatus));
  const banner = getOverallBanner(overallStatus);

  const categories = [...new Set(services.map(s => s.category))];

  const getDerivedStatus = (incident: any) => {
    const updates = (incident.incident_updates || []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return updates.length > 0 ? updates[0].status : incident.status;
  };

  const activeIncidents = incidents.filter(i => getDerivedStatus(i) !== 'resolved');
  const recentResolved = incidents.filter(i => getDerivedStatus(i) === 'resolved').slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {settings?.page_title || 'StatusWatch'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Overall status banner */}
        <div className={`${banner.bgClass} rounded-lg p-4 flex items-center gap-3 text-primary-foreground`}>
          <span className="text-lg font-semibold">{banner.label}</span>
        </div>


        {/* Active Incidents */}
        {activeIncidents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Active Incidents</h2>
            {activeIncidents.map(incident => (
              <IncidentCard key={incident.id} incident={incident} services={services} showLatestUpdate />
            ))}
          </section>
        )}

        {/* Services by category */}
        <section className="space-y-6">
          {categories.map(cat => {
            const catServices = services.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat}</h2>
                </div>
                <div className="space-y-2">
                  {catServices.map((service) => (
                    <div key={service.id}>
                      <ServiceFlipCard service={service} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Past incidents */}
        {recentResolved.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Past Incidents</h2>
            {recentResolved.map(incident => (
              <IncidentCard key={incident.id} incident={incident} services={services} />
            ))}
          </section>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 StatusWatch</span>
          <span className="text-xs">Updated just now</span>
        </div>
      </footer>
    </div>
  );
};

function IncidentCard({ incident, services = [], showLatestUpdate = false }: { incident: any; services?: any[]; showLatestUpdate?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const updates = (incident.incident_updates || []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestStatus = updates.length > 0 ? updates[0].status : incident.status;
  const statusCfg = incidentStatusConfig[latestStatus as IncidentStatus];

  const affectedServiceIds = (incident.incident_services || []).map((s: any) => s.service_id);
  const affectedServices = services.filter(s => affectedServiceIds.includes(s.id));
  const impactCfg = impactToServiceStatus[incident.impact] || impactToServiceStatus.none;

  const updateStatusBg: Record<string, string> = {
    investigating: 'bg-status-major-outage',
    identified: 'bg-status-partial-outage',
    monitoring: 'bg-status-degraded',
    resolved: 'bg-status-operational',
  };

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
        className={`w-full flex items-center justify-between p-4 text-left ${expanded ? 'hover:bg-accent/50 transition-colors cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-1.5 h-8 rounded-full shrink-0 ${updateStatusBg[latestStatus] || 'bg-muted'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-card-foreground truncate">{incident.title}</h3>
              <Badge className={`text-xs border-0 shrink-0 mr-2 ${impactCfg.color}`}>
                {impactCfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {format(new Date(incident.created_at), 'MMM d, yyyy · h:mm a')}
              </span>
              {affectedServices.length > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  {affectedServices.map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      {s.name}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {!expanded && showLatestUpdate && updates.length > 0 && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-sm text-muted-foreground ml-[1.125rem] line-clamp-2">
            <span className={`font-medium capitalize ${updateStatusColor[updates[0].status] || 'text-muted-foreground'}`}>
              {updates[0].status}
            </span>
            {' — '}
            {updates[0].message}
          </p>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4">
          <div className="ml-5 border-l-2 border-border pl-6 space-y-4">
            {updates.map((update: any) => {
              const uColor = updateStatusColor[update.status as string] || 'text-muted-foreground';
              return (
                <div key={update.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-border border-2 border-card" />
                  <div>
                    <span className={`text-sm font-semibold capitalize ${uColor}`}>
                      {update.status}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      — {format(new Date(update.created_at), 'MMM d, h:mm a')}
                    </span>
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

export default Index;
