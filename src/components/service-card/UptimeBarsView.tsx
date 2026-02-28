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
  return (
    <div className="flex gap-[2px] items-end w-full h-8 -mt-1">
      {uptimeDays.map((day, i) => {
        const date = subDays(new Date(), 89 - i);
        const label = `${format(date, 'MMM d, yyyy')}: ${statusLabels[day]}`;
        return (
          <div
            key={i}
            className={`flex-1 min-w-0 h-8 rounded-sm ${dayColors[day]} hover:opacity-80 transition-opacity`}
            onMouseEnter={() => onHover(label)}
          />
        );
      })}
    </div>
  );
}
