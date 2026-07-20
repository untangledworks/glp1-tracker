import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Summary {
  narrativeText: string;
  computedStats: {
    avgProtein: number;
    avgFiber: number;
    hydrationDays: number;
    symptomCorrelations: string[];
  };
}

export default function WeeklySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      const data = await api.getWeeklySummary();
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load weekly summary:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="text-forest/40">Loading...</div>;
  }

  if (!summary) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">This Week</h1>
        <p className="text-forest/60">No summary available yet. Keep logging and check back on Sunday!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">This Week</h1>

      <div className="bg-linen rounded-2xl p-6 border-l-4 border-sage">
        <p className="text-forest leading-relaxed font-display text-lg">{summary.narrativeText}</p>
      </div>

      {summary.computedStats.symptomCorrelations.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-honey">
          <p className="text-sm font-medium text-honey mb-3">Patterns noticed</p>
          <ul className="space-y-2">
            {summary.computedStats.symptomCorrelations.map((c, i) => (
              <li key={i} className="text-sm text-forest/70 leading-relaxed">{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
