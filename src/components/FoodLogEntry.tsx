import type { FoodLogEntry as FoodLogEntryType } from '../types';

interface FoodLogEntryProps {
  entry: FoodLogEntryType;
}

export function FoodLogEntry({ entry }: FoodLogEntryProps) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-forest/5 last:border-0">
      <span className="text-xs text-forest/40 w-14 shrink-0">{time}</span>
      <p className="text-forest/80">{entry.resolvedName || entry.rawInput}</p>
    </div>
  );
}
