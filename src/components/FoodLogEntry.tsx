import { useState } from 'react';
import { api } from '../api/client';
import type { FoodLogEntry as FoodLogEntryType } from '../types';

interface FoodLogEntryProps {
  entry: FoodLogEntryType;
  onDeleted?: (timestamp: string) => void;
}

export function FoodLogEntry({ entry, onDeleted }: FoodLogEntryProps) {
  const [confirming, setConfirming] = useState(false);
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      await api.deleteFood(entry.timestamp);
      onDeleted?.(entry.timestamp);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
    setConfirming(false);
  }

  const isPending = (entry as any)._pending;

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-forest/5 last:border-0 ${isPending ? 'opacity-50' : ''}`}>
      <span className="text-xs text-forest/40 w-14 shrink-0">
        {isPending ? (
          <div className="w-3.5 h-3.5 border-2 border-sage border-t-transparent rounded-full animate-spin mx-auto" />
        ) : time}
      </span>
      <p className="flex-1 text-forest/80">{entry.resolvedName || entry.rawInput}</p>
      {!isPending && (
        <button
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
            confirming ? 'bg-red-100 text-red-600' : 'text-forest/30 hover:text-forest/60'
          }`}
        >
          {confirming ? 'Confirm' : '✕'}
        </button>
      )}
    </div>
  );
}
