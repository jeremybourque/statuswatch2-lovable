import { useState, useMemo } from 'react';
import { statusConfig } from '@/lib/status-helpers';
import type { ServiceStatus } from '@/lib/status-helpers';
import { format, subDays } from 'date-fns';
import { BarChart3, CalendarDays, Activity } from 'lucide-react';


interface ServiceFlipCardProps {
  service: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
  };
}

function StatusDot({ status }: {status: ServiceStatus;}) {
  const cfg = statusConfig[status];
  return (
    <span className="relative flex h-3 w-3">
      {status !== 'operational' &&
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dotClass} opacity-75`} />
      }
      <span className={`relative inline-flex rounded-full h-3 w-3 ${cfg.dotClass}`} />
    </span>);

}

function generateMockUptime(serviceId: string): number[] {
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = (hash << 5) - hash + serviceId.charCodeAt(i) | 0;
  }
  const days: number[] = [];
  for (let i = 0; i < 90; i++) {
    hash = hash * 1103515245 + 12345 & 0x7fffffff;
    const rand = hash % 1000 / 1000;
    if (rand > 0.92) days.push(rand > 0.97 ? 0 : rand > 0.95 ? 1 : 2);else
    days.push(3);
  }
  return days;
}

const dayColors = [
'bg-status-major-outage',
'bg-status-partial-outage',
'bg-status-degraded',
'bg-status-operational'];


export function ServiceFlipCard({ service }: ServiceFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [backView, setBackView] = useState<'bars' | 'calendar' | 'graph'>('bars');
  const cfg = statusConfig[service.status as ServiceStatus];
  const uptimeDays = useMemo(() => generateMockUptime(service.id), [service.id]);

  const uptimePercent = useMemo(() => {
    const good = uptimeDays.filter((d) => d >= 2).length;
    return (good / uptimeDays.length * 100).toFixed(2);
  }, [uptimeDays]);

  return (
    <div
      className="relative h-[88px] cursor-pointer"
      style={{ perspective: '800px' }}
      onClick={() => setFlipped((f) => !f)}>

      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
        }}>

        {/* Front */}
        <div
          className="absolute inset-0 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}>

          <div className="p-4 flex items-center justify-between h-full">
            <div className="flex items-center gap-3 min-w-0">
              <StatusDot status={service.status as ServiceStatus} />
              <span className="text-base font-medium text-card-foreground truncate">{service.name}</span>
            </div>
            <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden p-4"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-card-foreground truncate">{service.name}</span>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setBackView('bars')}
                  className={`p-0.5 rounded transition-colors ${backView === 'bars' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Uptime bars"
                >
                  <BarChart3 size={12} />
                </button>
                <button
                  onClick={() => setBackView('calendar')}
                  className={`p-0.5 rounded transition-colors ${backView === 'calendar' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Calendar view"
                >
                  <CalendarDays size={12} />
                </button>
                <button
                  onClick={() => setBackView('graph')}
                  className={`p-0.5 rounded transition-colors ${backView === 'graph' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Response time"
                >
                  <Activity size={12} />
                </button>
              </div>
            </div>
            <span className="text-xs font-medium font-mono text-muted-foreground">{uptimePercent}%</span>
          </div>
          <div className="w-full">
              {backView === 'bars' && (
                <div className="flex gap-[2px] items-end w-full h-7">
                  {uptimeDays.map((day, i) => {
                    const date = subDays(new Date(), 89 - i);
                    return (
                      <div
                        key={i}
                        className={`flex-1 min-w-0 h-7 rounded-sm ${dayColors[day]} hover:opacity-80 transition-opacity`}
                        title={`${format(date, 'MMM d, yyyy')}: ${['Major Outage', 'Partial Outage', 'Degraded', 'Operational'][day]}`} />
                    );
                  })}
                </div>
              )}
              {backView === 'calendar' && (() => {
                const today = new Date(2026, 1, 15); // Feb 15
                const statusMap = new Map<string, number>();
                for (let i = 0; i < 90; i++) {
                  const d = subDays(today, 89 - i);
                  statusMap.set(format(d, 'yyyy-MM-dd'), uptimeDays[i]);
                }
                const monthsSet: Date[] = [];
                for (let i = 89; i >= 0; i--) {
                  const d = subDays(today, i);
                  const key = format(d, 'yyyy-MM');
                  if (!monthsSet.find(m => format(m, 'yyyy-MM') === key)) {
                    monthsSet.push(new Date(d.getFullYear(), d.getMonth(), 1));
                  }
                }
                const months = monthsSet.slice(-3);
                return (
                  <div className="flex gap-1.5 h-7 w-full">
                    {months.map((monthStart, mi) => {
                      const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
                      const startDow = monthStart.getDay();
                      return (
                        <div key={mi} className="flex-1 flex flex-col min-w-0">
                          <div className="grid grid-cols-7 grid-rows-5 gap-[1px] flex-1">
                            {Array.from({ length: startDow }).map((_, i) => (
                              <div key={`e${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, di) => {
                              const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), di + 1);
                              const key = format(date, 'yyyy-MM-dd');
                              const status = statusMap.get(key);
                              return (
                                <div
                                  key={di}
                                  className={`rounded-[1.5px] ${status !== undefined ? dayColors[status] : 'bg-muted/30'}`}
                                  title={`${format(date, 'MMM d')}: ${status !== undefined ? ['Major Outage', 'Partial Outage', 'Degraded', 'Operational'][status] : 'No data'}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {backView === 'graph' && (
                <svg viewBox="0 0 200 28" className="w-full h-7" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                    points={uptimeDays.map((d, i) => `${(i / 89) * 200},${28 - (d / 3) * 20 - 4 + ((i * 7 + d * 3) % 8)}`).join(' ')}
                  />
                </svg>
              )}
          </div>
        </div>
      </div>
    </div>);

}