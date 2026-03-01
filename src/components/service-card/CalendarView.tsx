import { format, subDays } from 'date-fns';

const dayColors = [
  'bg-status-major-outage',
  'bg-status-partial-outage',
  'bg-status-degraded',
  'bg-status-operational',
];

const statusLabels = ['Major Outage', 'Partial Outage', 'Degraded', 'Operational'];

interface CalendarViewProps {
  uptimeDays: number[];
  onHover: (label: string | null) => void;
}

export function CalendarView({ uptimeDays, onHover }: CalendarViewProps) {
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

  return (
    <div className="flex gap-3 h-10 w-full">
      {monthsSet.map((monthStart, mi) => {
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
                const label = `${format(date, 'MMM d, yyyy')} — ${status !== undefined ? statusLabels[status] : 'No data'}`;
                return (
                  <div
                    key={di}
                    className={`rounded-[1.5px] ${status !== undefined ? dayColors[status] : 'bg-muted-foreground/30'}`}
                    onMouseEnter={() => onHover(label)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
