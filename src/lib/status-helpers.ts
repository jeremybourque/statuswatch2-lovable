export type ServiceStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentImpact = 'none' | 'minor' | 'major' | 'critical';

export const statusConfig: Record<ServiceStatus, { label: string; color: string; dotClass: string }> = {
  operational: { label: 'Operational', color: 'text-status-operational', dotClass: 'bg-status-operational' },
  degraded: { label: 'Degraded Performance', color: 'text-status-degraded', dotClass: 'bg-status-degraded' },
  partial_outage: { label: 'Partial Outage', color: 'text-status-partial-outage', dotClass: 'bg-status-partial-outage' },
  major_outage: { label: 'Major Outage', color: 'text-status-major-outage', dotClass: 'bg-status-major-outage' },
};

export const impactConfig: Record<IncidentImpact, { label: string; color: string }> = {
  none: { label: 'None', color: 'bg-muted text-muted-foreground' },
  minor: { label: 'Minor', color: 'bg-status-degraded/20 text-status-degraded' },
  major: { label: 'Major', color: 'bg-status-partial-outage/20 text-status-partial-outage' },
  critical: { label: 'Critical', color: 'bg-status-major-outage/20 text-status-major-outage' },
};

export const incidentStatusConfig: Record<IncidentStatus, { label: string; color: string }> = {
  investigating: { label: 'Investigating', color: 'bg-status-major-outage/20 text-status-major-outage' },
  identified: { label: 'Identified', color: 'bg-status-partial-outage/20 text-status-partial-outage' },
  monitoring: { label: 'Monitoring', color: 'bg-status-degraded/20 text-status-degraded' },
  resolved: { label: 'Resolved', color: 'bg-status-operational/20 text-status-operational' },
};

const statusSeverity: Record<ServiceStatus, number> = {
  operational: 0,
  degraded: 1,
  partial_outage: 2,
  major_outage: 3,
};

export function getOverallStatus(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.length === 0) return 'operational';
  let worst: ServiceStatus = 'operational';
  for (const s of statuses) {
    if (statusSeverity[s] > statusSeverity[worst]) worst = s;
  }
  return worst;
}

export function getOverallBanner(status: ServiceStatus): { label: string; bgClass: string } {
  switch (status) {
    case 'operational':
      return { label: 'All Systems Operational', bgClass: 'bg-status-operational' };
    case 'degraded':
      return { label: 'Degraded System Performance', bgClass: 'bg-status-degraded' };
    case 'partial_outage':
      return { label: 'Partial System Outage', bgClass: 'bg-status-partial-outage' };
    case 'major_outage':
      return { label: 'Major System Outage', bgClass: 'bg-status-major-outage' };
  }
}
