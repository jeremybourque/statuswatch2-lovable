import { useServices } from '@/hooks/use-services';
import { useIncidents } from '@/hooks/use-incidents';
import { useStatusPage } from '@/hooks/use-status-page';
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
import { ChevronDown, Activity, Settings, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';

const StatusPage = () => {
  const { statusPageId, slug, data: statusPage } = useStatusPage();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { data: services = [] } = useServices(statusPageId);
  const { data: incidents = [] } = useIncidents(statusPageId);

  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const recentResolved = incidents.filter(i => getDerivedStatus(i) === 'resolved').slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="relative">
          <div className="max-w-3xl mx-auto px-4 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-7 w-7 text-primary" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {statusPage?.name || 'StatusWatch'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <ThemeToggle />
              <Link to={`/${slug}/admin`} className="text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <hr className="border-t border-border m-0" />
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-10 px-2 py-1 group"
            aria-label="Toggle navigation drawer"
          >
            <div className={`w-[11.25rem] h-[5px] rounded-full transition-colors group-hover:bg-muted-foreground ${drawerOpen ? 'bg-muted-foreground/50' : 'bg-border'}`} />
          </button>
        </div>

        <div
          className={`bg-card overflow-hidden transition-all duration-500 ease-in-out ${drawerOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
                <div className="space-y-4">
                  {(() => {
                    const disrupted = services.filter(s => s.status !== 'operational');
                    const healthy = services.filter(s => s.status === 'operational');
                    const showGroups = services.length > 15;

                    if (showGroups) {
                      const groupStatus = (catServices: typeof services) => {
                        const worst = catServices.reduce((acc, s) => {
                          const sev: Record<string, number> = { operational: 0, degraded: 1, partial_outage: 2, major_outage: 3 };
                          return (sev[s.status as string] ?? 0) > (sev[acc] ?? 0) ? s.status : acc;
                        }, 'operational');
                        return worst as ServiceStatus;
                      };

                      const disruptedCats = categories.filter(cat => {
                        const catServices = services.filter(s => s.category === cat);
                        return groupStatus(catServices) !== 'operational';
                      });
                      const healthyCats = categories.filter(cat => {
                        const catServices = services.filter(s => s.category === cat);
                        return groupStatus(catServices) === 'operational';
                      });

                      const GroupButton = ({ cat }: { cat: string }) => {
                        const catServices = services.filter(s => s.category === cat);
                        const status = groupStatus(catServices);
                        const cfg = statusConfig[status];
                        return (
                          <button
                            onClick={() => {
                              setDrawerOpen(false);
                              const firstService = catServices[0];
                              if (firstService) document.getElementById(`service-${firstService.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotClass}`} />
                            <span className="text-sm text-foreground truncate">{cat}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{catServices.length}</span>
                          </button>
                        );
                      };

                      return (
                        <>
                          {disruptedCats.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5">
                              {disruptedCats.map(cat => <GroupButton key={cat} cat={cat} />)}
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-1.5">
                            {healthyCats.map(cat => <GroupButton key={cat} cat={cat} />)}
                          </div>
                        </>
                      );
                    }

                    const ServiceButton = ({ s }: { s: any }) => {
                      const cfg = statusConfig[s.status as ServiceStatus] || statusConfig.operational;
                      return (
                        <button
                          onClick={() => { setDrawerOpen(false); document.getElementById(`service-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotClass}`} />
                          <span className="text-sm text-foreground truncate">{s.name}</span>
                        </button>
                      );
                    };
                    return (
                      <>
                        {disrupted.length > 0 && (
                          <div className="grid grid-cols-3 gap-1.5">
                            {disrupted.map(s => <ServiceButton key={s.id} s={s} />)}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-1.5">
                          {healthy.map(s => <ServiceButton key={s.id} s={s} />)}
                        </div>
                      </>
                    );
                  })()}
                </div>
            </div>
        </div>
        <hr className="border-t border-border m-0 -mt-px" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className={`${banner.bgClass} rounded-lg p-4 flex items-center gap-3 text-primary-foreground`}>
          <span className="text-lg font-semibold">{banner.label}</span>
        </div>

        {activeIncidents.length > 0 && (
          <section id="active-incidents" className="space-y-3 scroll-mt-20">
            <h2 className="text-xl font-semibold text-foreground">{activeIncidents.length} Active Incident{activeIncidents.length !== 1 ? 's' : ''}</h2>
            {activeIncidents.map(incident => (
              <div key={incident.id} id={`incident-${incident.id}`} className="scroll-mt-20">
                <IncidentCard incident={incident} services={services} showLatestUpdate />
              </div>
            ))}
          </section>
        )}

        <section id="services" className="space-y-6 scroll-mt-20">
          <h2 className="text-xl font-semibold text-foreground">Services</h2>
          {categories.map(cat => {
            const catServices = services.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat}</h2>
                </div>
                <div className="space-y-2">
                  {catServices.map((service) => (
                    <div key={service.id} id={`service-${service.id}`} className="scroll-mt-20">
                      <ServiceFlipCard service={service} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {recentResolved.length > 0 && (
          <Collapsible id="past-incidents" className="scroll-mt-20" defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center gap-2 group w-full">
              <h2 className="text-xl font-semibold text-foreground">Past Incidents</h2>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 mt-3">
                {recentResolved.map(incident => (
                  <IncidentCard key={incident.id} incident={incident} services={services} />
                ))}
                <Link to={`/${slug}/history`} className="text-sm text-primary hover:underline inline-block mt-1">
                  View all past incidents →
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
          <div className={`w-1.5 h-8 rounded-full shrink-0 mt-1.5 ${{ investigating: 'bg-status-major-outage', identified: 'bg-status-partial-outage', monitoring: 'bg-status-degraded', resolved: 'bg-status-operational' }[latestStatus] || 'bg-muted'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-card-foreground truncate">{incident.title}</h3>
              {latestStatus !== 'resolved' && (
                <span className={`text-sm font-medium shrink-0 mr-2 ${impactCfg.color.replace(/bg-\S+/g, '').trim()}`}>
                  {impactCfg.label}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground shrink-0">
                {format(new Date(incident.created_at), 'MMM d, yyyy · h:mm a')}
              </span>
              {affectedServices.length > 0 && (
                <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                  {affectedServices.map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {showLatestUpdate && updates.length > 0 && (
        <div
          className="grid transition-all duration-300 ease-in-out"
          style={{ gridTemplateRows: expanded ? '0fr' : '1fr' }}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-3 -mt-1">
              <p className="text-sm text-muted-foreground ml-[1.125rem] line-clamp-2">
                <span className={`font-medium capitalize ${updateStatusColor[updates[0].status] || 'text-muted-foreground'}`}>
                  {updates[0].status}
                </span>
                {' — '}
                {updates[0].message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}

export default StatusPage;
