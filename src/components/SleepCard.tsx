import { useState } from 'react';

interface SleepCardProps {
  onSave?: (bedTime: string, wakeTime: string) => void;
  onDismiss?: () => void;
}

export function SleepCard({ onSave, onDismiss }: SleepCardProps) {
  const sleepEnabled = localStorage.getItem('sleepTrackingEnabled') === 'true';
  const today = new Date().toISOString().split('T')[0];
  const alreadyLogged = localStorage.getItem(`sleepLoggedToday_${today}`) === 'true';

  const lastBedTime = localStorage.getItem(`sleepBedTime_${today}`) || '22:30';
  const lastWakeTime = localStorage.getItem(`sleepWakeTime_${today}`) || '07:00';

  const [bedTime, setBedTime] = useState(lastBedTime);
  const [wakeTime, setWakeTime] = useState(lastWakeTime);
  const [dismissed, setDismissed] = useState(false);

  if (!sleepEnabled || alreadyLogged || dismissed) return null;

  function handleSave() {
    localStorage.setItem(`sleepBedTime_${today}`, bedTime);
    localStorage.setItem(`sleepWakeTime_${today}`, wakeTime);
    localStorage.setItem(`sleepLoggedToday_${today}`, 'true');
    setDismissed(true);
    onSave?.(bedTime, wakeTime);
  }

  function handleDismiss() {
    localStorage.setItem(`sleepLoggedToday_${today}`, 'true');
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-forest/5">
      <h3 className="font-medium text-forest">How'd you sleep?</h3>
      <div className="flex gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-forest/50">Bed time</label>
          <input
            type="time"
            value={bedTime}
            onChange={(e) => setBedTime(e.target.value)}
            className="w-full bg-ivory border border-forest/10 rounded-xl px-3 py-2.5 text-forest focus:outline-none focus:ring-2 focus:ring-sage/30"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-forest/50">Wake time</label>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="w-full bg-ivory border border-forest/10 rounded-xl px-3 py-2.5 text-forest focus:outline-none focus:ring-2 focus:ring-sage/30"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-dark transition-colors"
        >
          Save
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 py-2.5 rounded-xl bg-linen text-forest/60 text-sm font-medium hover:bg-forest/5 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
