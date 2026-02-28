import { useState, useMemo } from 'react';
import { statusConfig } from '@/lib/status-helpers';
import type { ServiceStatus } from '@/lib/status-helpers';
import { format, subDays } from 'date-fns';
import { BarChart3, CalendarDays, Activity, Info } from 'lucide-react';


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
  const [rotationX, setRotationX] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [mouseInTopHalf, setMouseInTopHalf] = useState(true);
  const [backView, setBackView] = useState<'bars' | 'calendar' | 'graph'>('bars');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const cfg = statusConfig[service.status as ServiceStatus];
  const uptimeDays = useMemo(() => generateMockUptime(service.id), [service.id]);

  const uptimePercent = useMemo(() => {
    const good = uptimeDays.filter((d) => d >= 2).length;
    return (good / uptimeDays.length * 100).toFixed(2);
  }, [uptimeDays]);

  const statusLabels = ['Major Outage', 'Partial Outage', 'Degraded', 'Operational'];
  const isFlipped = Math.abs(Math.round(rotationX / 180)) % 2 === 1;

  return (
    <div
      className="relative h-[110px] cursor-pointer"
      style={{ perspective: '800px' }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const isTopHalf = clickY < rect.height / 2;
        const direction = isTopHalf ? 1 : -1;

        setRotationX((prev) => {
          const next = prev + direction * 180;
          return Math.abs(next) >= 3600 ? next % 360 : next;
        });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseInTopHalf(e.clientY - rect.top < rect.height / 2);
      }}>

      <div
        className={`absolute inset-0 transition-transform duration-500 ${!isFlipped && hovered ? (mouseInTopHalf ? 'animate-flip-wiggle' : 'animate-flip-wiggle-reverse') : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotationX}deg)`
        }}>

        {/* Front */}
        <div
          className="group absolute inset-0 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}>

          <div className="p-4 flex flex-col justify-center h-full">
            {service.description && (
              <p className="text-sm invisible pl-6">&nbsp;</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <StatusDot status={service.status as ServiceStatus} />
                <span className="text-lg font-medium text-card-foreground truncate">{service.name}</span>
                <Info size={16} className="text-muted-foreground shrink-0" />
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
              <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setBackView('bars')}
                  className={`p-2 -m-1 rounded transition-colors ${backView === 'bars' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Uptime bars"
                >
                  <BarChart3 size={14} />
                </button>
                <button
                  onClick={() => setBackView('calendar')}
                  className={`p-2 -m-1 rounded transition-colors ${backView === 'calendar' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Calendar view"
                >
                  <CalendarDays size={14} />
                </button>
                <button
                  onClick={() => setBackView('graph')}
                  className={`p-2 -m-1 rounded transition-colors ${backView === 'graph' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Response time"
                >
                  <Activity size={14} />
                </button>
              </div>
            </div>
            <span className="text-xs font-medium font-mono text-muted-foreground">{uptimePercent}% uptime</span>
          </div>
          <div className="w-full flex-1 flex flex-col" onMouseLeave={() => setHoveredDay(null)}>
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
              {backView === 'graph' && (() => {
                // Generate mock page load times for past 7 days (every 4 hours = 42 points)
                const points: { time: Date; value: number }[] = [];
                let hash = 0;
                for (let i = 0; i < service.id.length; i++) {
                  hash = (hash << 5) - hash + service.id.charCodeAt(i) | 0;
                }
                const now = new Date();
                for (let i = 0; i < 42; i++) {
                  hash = (hash * 1103515245 + 12345) & 0x7fffffff;
                  const ms = 200 + (hash % 800) + Math.sin(i * 0.5) * 100;
                  const time = new Date(now.getTime() - (41 - i) * 4 * 60 * 60 * 1000);
                  points.push({ time, value: ms / 1000 });
                }
                const minVal = 0;
                const maxVal = 2;
                const range = 2;
                const padded = 2;
                const chartH = 32;
                const chartW = 540;
                const oX = 4;
                const oY = 2;
                const vbW = oX + chartW + 50;
                const vbH = chartH + 10;
                const yTicks = [0, 1, 2];
                const dayLabels: { x: number; label: string }[] = [];
                for (let d = 6; d >= 0; d--) {
                  const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
                  const frac = 1 - d / 6;
                  dayLabels.push({ x: oX + frac * chartW, label: format(day, 'EEE').charAt(0) });
                }
                const svgPoints = points.map((p, i) => {
                  const x = oX + (i / 41) * chartW;
                  const y = oY + chartH - ((p.value - minVal) / padded) * chartH;
                  return `${x},${y}`;
                }).join(' ');
                const areaPath = `M${oX},${oY + chartH} ` + points.map((p, i) => {
                  const x = oX + (i / 41) * chartW;
                  const y = oY + chartH - ((p.value - minVal) / padded) * chartH;
                  return `L${x},${y}`;
                }).join(' ') + ` L${oX + chartW},${oY + chartH} Z`;

                return (
                  <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full flex-1" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    {/* Y-axis labels */}
                    {yTicks.map((t, i) => {
                      const y = oY + chartH - ((t - minVal) / padded) * chartH;
                      return (
                        <text key={i} x={oX + chartW + 3} y={y + 2} textAnchor="start" className="fill-muted-foreground" style={{ fontSize: '7px' }}>
                          {t}
                        </text>
                      );
                    })}
                    {/* X-axis day labels */}
                    {dayLabels.map((d, i) => (
                      <text key={i} x={d.x} y={oY + chartH + 9} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '7px' }}>
                        {d.label}
                      </text>
                    ))}
                    {/* Grid lines */}
                    {yTicks.map((t, i) => {
                      const y = oY + chartH - ((t - minVal) / padded) * chartH;
                      return <line key={i} x1={oX} x2={oX + chartW} y1={y} y2={y} className="stroke-border" strokeWidth="0.3" />;
                    })}
                    {/* Area fill */}
                    <path d={areaPath} fill="hsl(var(--primary))" opacity="0.1" />
                    {/* Line */}
                    <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1" points={svgPoints} />
                    {/* Interactive hover points */}
                    {points.map((p, i) => {
                      const x = oX + (i / 41) * chartW;
                      const y = oY + chartH - ((p.value - minVal) / padded) * chartH;
                      const label = `${format(p.time, 'EEE h:mma')}: ${(p.value * 1000).toFixed(0)}ms`;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="2.5"
                          className="fill-transparent hover:fill-primary cursor-pointer"
                          onMouseEnter={() => setHoveredDay(label)}
                        />
                      );
                    })}
                  </svg>
                );
              })()}
          </div>
          <div className="mt-auto pt-1 h-5">
            <span className="text-xs font-medium text-foreground truncate block">{hoveredDay ?? '\u00A0'}</span>
          </div>
        </div>
      </div>
    </div>);

}