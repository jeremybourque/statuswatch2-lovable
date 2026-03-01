import { useServices } from '@/hooks/use-services';
import { useIncidents } from '@/hooks/use-incidents';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { getOverallStatus, getOverallBanner, statusConfig, incidentStatusConfig, impactConfig } from '@/lib/status-helpers';
import type { ServiceStatus, IncidentStatus, IncidentImpact } from '@/lib/status-helpers';
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

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const recentResolved = incidents.filter(i => i.status === 'resolved').slice(0, 5);

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
              <IncidentCard key={incident.id} incident={incident} services={services} />
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

function IncidentCard({ incident, services = [] }: { incident: any; services?: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const updates = (incident.incident_updates || []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestStatus = updates.length > 0 ? updates[0].status : incident.status;
  const statusCfg = incidentStatusConfig[latestStatus as IncidentStatus];

  const affectedServiceIds = (incident.incident_services || []).map((s: any) => s.service_id);
  const affectedServices = services.filter(s => affectedServiceIds.includes(s.id));

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
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-8 rounded-full ${updateStatusBg[latestStatus] || 'bg-muted'}`} />
          <div>
            <h3 className="font-semibold text-card-foreground">{incident.title}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {format(new Date(incident.created_at), 'MMM d, yyyy · h:mm a')}
              </span>
              {affectedServices.length > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  {affectedServices.map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs py-0 px-1.5">
                      {s.name}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
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
