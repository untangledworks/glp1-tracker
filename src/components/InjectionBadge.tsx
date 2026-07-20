import { getInjectionCycleDay } from '../utils/greeting';

interface InjectionBadgeProps {
  today?: Date;
}

export function InjectionBadge({ today }: InjectionBadgeProps) {
  const injectionDayOfWeek = localStorage.getItem('injectionDayOfWeek');
  const cycle = getInjectionCycleDay(injectionDayOfWeek, today);

  if (!cycle) return null;

  const label = cycle.isInjectionDay
    ? 'Injection Day 💉'
    : `Day ${cycle.dayNumber} post-injection`;

  return (
    <span className={`inline-block text-sm px-3 py-1 rounded-full ${
      cycle.isInjectionDay
        ? 'bg-sage-light text-sage-dark font-medium'
        : 'bg-linen text-forest/60'
    }`}>
      {label}
    </span>
  );
}
