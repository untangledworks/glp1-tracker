import { useState } from 'react';

interface SupplementToggleProps {
  onToggle?: (taken: boolean) => void;
}

export function SupplementToggle({ onToggle }: SupplementToggleProps) {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `supplementsToday_${today}`;
  const [taken, setTaken] = useState(() => localStorage.getItem(storageKey) === 'true');

  function handleToggle() {
    const newValue = !taken;
    setTaken(newValue);
    if (newValue) {
      localStorage.setItem(storageKey, 'true');
    } else {
      localStorage.removeItem(storageKey);
    }
    onToggle?.(newValue);
  }

  if (taken) return null;

  return (
    <button
      onClick={handleToggle}
      className="w-full flex items-center gap-3 p-4 rounded-2xl transition-colors bg-white border border-forest/10"
    >
      <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors border-forest/20" />
      <span className="text-forest/80">Took supplements today</span>
    </button>
  );
}
