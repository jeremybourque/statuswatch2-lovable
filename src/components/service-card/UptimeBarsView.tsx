import { format, subDays } from 'date-fns';

const dayColors = [
  'bg-status-major-outage',
  'bg-status-partial-outage',
  'bg-status-degraded',
  'bg-status-operational',
];

const statusLabels = ['Major Outage', 'Partial Outage', 'Degraded', 'Operational'];

interface UptimeBarsViewProps {
  uptimeDays: number[];
  onHover: (label: string | null) => void;
}

export function UptimeBarsView({ uptimeDays, onHover }: UptimeBarsViewProps) {
  // Group days by month
  const months: { key: string; days: { day: number; date: Date; index: number }[] }[] = [];
  for (let i = 0; i < uptimeDays.length; i++) {
    const date = subDays(new Date(), 89 - i);
    const key = format(date, 'yyyy-MM');
    const last = months[months.length - 1];
    if (last && last.key === key) {
      last.days.push({ day: uptimeDays[i], date, index: i });
    } else {
      months.push({ key, days: [{ day: uptimeDays[i], date, index: i }] });
    }
  }

  return (
    <div className="flex gap-1 items-end w-full h-8 mt-0.5">
      {months.map((month) => (
        <div key={month.key} className="flex gap-[2px] flex-1 min-w-0 h-8">
          {month.days.map(({ day, date, index }) => {
            const label = `${format(date, 'MMM d, yyyy')} ● ${statusLabels[day]}`;
            return (
              <div
                key={index}
                className={`flex-1 min-w-0 h-8 rounded-sm ${dayColors[day]} hover:opacity-80 transition-opacity`}
                onMouseEnter={() => onHover(label)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
