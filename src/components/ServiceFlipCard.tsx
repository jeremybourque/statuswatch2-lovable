import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { statusConfig } from '@/lib/status-helpers';
import type { ServiceStatus } from '@/lib/status-helpers';
import { format, subDays } from 'date-fns';
import { BarChart3, CalendarDays, Activity } from 'lucide-react';

function useWiggleAnimation() {
  const elRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const iterationRef = useRef(0);
  const activeRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const setRot = useCallback((deg: number, ms: number) => {
    if (elRef.current) {
      elRef.current.style.transition = `transform ${ms}ms ease-in-out`;
      elRef.current.style.transform = `rotateX(${deg}deg)`;
    }
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const runSequence = useCallback(() => {
    if (!activeRef.current) return;
    let t = 0;
    // First wiggle: 5deg
    schedule(() => setRot(5, 400), t); t += 400;
    // Hold 100ms then back
    t += 100;
    schedule(() => setRot(0, 400), t); t += 400;
    // Wait 5s
    t += 5000;
    // Second wiggle: 10deg
    schedule(() => setRot(10, 600), t); t += 600;
    // Hold 200ms then back
    t += 200;
    schedule(() => setRot(0, 400), t); t += 400;

    iterationRef.current++;
    if (iterationRef.current < 2) {
      // Sleep 30s then repeat
      schedule(() => {
        if (activeRef.current) runSequence();
      }, t + 30000);
    }
  }, [schedule, setRot]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    iterationRef.current = 0;
    // Initial 2s delay
    schedule(() => {
      if (activeRef.current) runSequence();
    }, 2000);
  }, [schedule, runSequence]);

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimers();
    if (elRef.current) {
      elRef.current.style.transition = 'transform 300ms ease-in-out';
      elRef.current.style.transform = 'rotateX(0deg)';
    }
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { elRef, start, stop };
}


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
  const { elRef: wiggleRef, start: startWiggle, stop: stopWiggle } = useWiggleAnimation();
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
      onClick={() => setFlipped((f) => !f)}
      onMouseEnter={() => { if (!flipped) startWiggle(); }}
      onMouseLeave={() => stopWiggle()}>

      <div
        ref={wiggleRef}
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
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
          style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>

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