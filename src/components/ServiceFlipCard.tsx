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
  const [flipDirection, setFlipDirection] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);
  const [backView, setBackView] = useState<'bars' | 'calendar' | 'graph'>('bars');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const cfg = statusConfig[service.status as ServiceStatus];
  const uptimeDays = useMemo(() => generateMockUptime(service.id), [service.id]);

  const uptimePercent = useMemo(() => {
    const good = uptimeDays.filter((d) => d >= 2).length;
    return (good / uptimeDays.length * 100).toFixed(2);
  }, [uptimeDays]);

  const statusLabels = ['Major Outage', 'Partial Outage', 'Degraded', 'Operational'];

  return (
    <div
      className="relative h-[110px] cursor-pointer"
      style={{ perspective: '800px' }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const isTopHalf = clickY < rect.height / 2;
        const dir = isTopHalf ? 1 : -1;
        setFlipDirection((flipped ? -dir : dir) as 1 | -1);
        setFlipped((f) => !f);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      <div
        className={`absolute inset-0 transition-transform duration-500 ${!flipped && hovered ? 'animate-flip-wiggle' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? `rotateX(${flipDirection * 180}deg)` : 'rotateX(0deg)'
        }}>

        {/* Front */}
        <div
          className="group absolute inset-0 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}>

          <div className="p-4 flex flex-col justify-center h-full gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <StatusDot status={service.status as ServiceStatus} />
                <span className="text-lg font-medium text-card-foreground truncate">{service.name}</span>
              </div>
              <span className={`text-base font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground truncate pl-6 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms] delay-0 group-hover:delay-200">{service.description}</p>
            )}
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden p-4 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: `rotateX(${flipDirection * 180}deg)` }}>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-card-foreground truncate">{service.name}</span>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setBackView('bars')}
                  className={`p-0.5 rounded transition-colors ${backView === 'bars' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Uptime bars"
                >
                  <BarChart3 size={14} />
                </button>
                <button
                  onClick={() => setBackView('calendar')}
                  className={`p-0.5 rounded transition-colors ${backView === 'calendar' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Calendar view"
                >
                  <CalendarDays size={14} />
                </button>
                <button
                  onClick={() => setBackView('graph')}
                  className={`p-0.5 rounded transition-colors ${backView === 'graph' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Response time"
                >
                  <Activity size={14} />
                </button>
              </div>
            </div>
            <span className="text-xs font-medium font-mono text-muted-foreground">{uptimePercent}% uptime</span>
          </div>
          <div className="w-full" onMouseLeave={() => setHoveredDay(null)}>
              {backView === 'bars' && (
                <div className="flex gap-[2px] items-end w-full h-8 mt-2">
                  {uptimeDays.map((day, i) => {
                    const date = subDays(new Date(), 89 - i);
                    const label = `${format(date, 'MMM d, yyyy')}: ${statusLabels[day]}`;
                    return (
                      <div
                        key={i}
                        className={`flex-1 min-w-0 h-8 rounded-sm ${dayColors[day]} hover:opacity-80 transition-opacity`}
                        onMouseEnter={() => setHoveredDay(label)} />
                    );
                  })}
                </div>
              )}
              {backView === 'calendar' && (() => {
                const today = new Date(2026, 1, 15);
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
                const months = monthsSet;
                return (
                  <div className="flex gap-3 h-10 w-full">
                    {months.map((monthStart, mi) => {
                      const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
                      const startDow = monthStart.getDay();
                      return (
                        <div key={mi} className="flex-1 flex flex-col min-w-0">
                          <div className="grid grid-cols-7 grid-rows-6 gap-[2px] flex-1">
                            {Array.from({ length: startDow }).map((_, i) => (
                              <div key={`e${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, di) => {
                              const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), di + 1);
                              const key = format(date, 'yyyy-MM-dd');
                              const status = statusMap.get(key);
                              const label = `${format(date, 'MMM d')}: ${status !== undefined ? statusLabels[status] : 'No data'}`;
                              return (
                                <div
                                  key={di}
                                  className={`rounded-[1.5px] ${status !== undefined ? dayColors[status] : 'bg-muted-foreground/30'}`}
                                  onMouseEnter={() => setHoveredDay(label)}
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
                <svg viewBox="0 0 200 40" className="w-full h-10" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                    points={uptimeDays.map((d, i) => `${(i / 89) * 200},${40 - (d / 3) * 28 - 4 + ((i * 7 + d * 3) % 8)}`).join(' ')}
                  />
                </svg>
              )}
          </div>
          <div className="mt-auto pt-1 h-5">
            <span className="text-xs font-medium text-foreground truncate block">{hoveredDay ?? '\u00A0'}</span>
          </div>
        </div>
      </div>
    </div>);

}