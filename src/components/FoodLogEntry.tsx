import type { FoodLogEntry as FoodLogEntryType } from '../types';

interface FoodLogEntryProps {
  entry: FoodLogEntryType;
}

export function FoodLogEntry({ entry }: FoodLogEntryProps) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100">
      <div>
        <span className="text-sm text-gray-500">{time}</span>
        <p className="text-gray-800">{entry.resolvedName || entry.rawInput}</p>
      </div>
    </div>
  );
}
