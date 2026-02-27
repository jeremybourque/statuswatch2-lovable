import { useServices } from '@/hooks/use-services';
import { useIncidents } from '@/hooks/use-incidents';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { getOverallStatus, getOverallBanner, statusConfig, incidentStatusConfig, impactConfig } from '@/lib/status-helpers';
import type { ServiceStatus, IncidentStatus, IncidentImpact } from '@/lib/status-helpers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

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
      <header className="border-b border-border">
        <div className="container max-w-4xl py-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">{settings?.page_title || 'StatusWatch'}</h1>
          <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Overall status banner */}
      <div className={`${banner.bgClass} py-4`}>
        <div className="container max-w-4xl">
          <p className="text-sm font-semibold text-primary-foreground">{banner.label}</p>
        </div>
      </div>

      <main className="container max-w-4xl py-8 space-y-8">
        {/* Description */}
        {settings?.page_description && (
          <p className="text-muted-foreground text-sm">{settings.page_description}</p>
        )}

        {/* Active Incidents */}
        {activeIncidents.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Active Incidents</h2>
            {activeIncidents.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </section>
        )}

        {/* Services by category */}
        <section className="space-y-6">
          {categories.map(cat => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{cat}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {services.filter(s => s.category === cat).map((service, i, arr) => {
                  const cfg = statusConfig[service.status as ServiceStatus];
                  return (
                    <div key={service.id} className={`flex items-center justify-between px-6 py-3 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                      <span className="text-sm font-medium">{service.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Past incidents */}
        {recentResolved.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Past Incidents</h2>
            {recentResolved.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </section>
        )}
      </main>

      <footer className="border-t border-border py-6">
        <div className="container max-w-4xl text-center text-xs text-muted-foreground">
          Powered by StatusWatch
        </div>
      </footer>
    </div>
  );
};

function IncidentCard({ incident }: { incident: any }) {
  const statusCfg = incidentStatusConfig[incident.status as IncidentStatus];
  const impactCfg = impactConfig[incident.impact as IncidentImpact];
  const updates = (incident.incident_updates || []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-medium">{incident.title}</CardTitle>
              <Badge className={`${statusCfg.color} border-0 text-xs`}>{statusCfg.label}</Badge>
              <Badge className={`${impactCfg.color} border-0 text-xs`}>{impactCfg.label}</Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">{format(new Date(incident.created_at), 'MMM d, HH:mm')}</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {updates.map((update: any) => {
              const uCfg = incidentStatusConfig[update.status as IncidentStatus] || { label: update.status, color: '' };
              return (
                <div key={update.id} className="flex gap-3 text-sm border-l-2 border-border pl-4 py-1">
                  <div className="shrink-0 space-y-1">
                    <Badge className={`${uCfg.color} border-0 text-xs`}>{uCfg.label}</Badge>
                    <p className="text-xs text-muted-foreground">{format(new Date(update.created_at), 'MMM d, HH:mm')}</p>
                  </div>
                  <p className="text-muted-foreground">{update.message}</p>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default Index;
