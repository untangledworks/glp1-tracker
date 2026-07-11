import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  if (!summary) {
    return (
      <div className="p-4 space-y-4 pb-20">
        <h1 className="text-xl font-bold text-gray-800">Weekly Summary</h1>
        <p className="text-gray-600">No summary available yet. Keep logging and check back on Sunday!</p>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around max-w-md mx-auto">
          <Link to="/" className="text-gray-500 text-xs">Log</Link>
          <Link to="/nutrition" className="text-gray-500 text-xs">Nutrition</Link>
          <Link to="/hydration" className="text-gray-500 text-xs">Water</Link>
          <Link to="/symptoms" className="text-gray-500 text-xs">Symptoms</Link>
          <Link to="/weekly" className="text-emerald-600 text-xs font-medium">Week</Link>
          <Link to="/settings" className="text-gray-500 text-xs">Settings</Link>
        </nav>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">This Week</h1>

      <div className="bg-emerald-50 rounded-xl p-5">
        <p className="text-gray-800 leading-relaxed">{summary.narrativeText}</p>
      </div>

      {summary.computedStats.symptomCorrelations.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">Patterns noticed:</p>
          <ul className="space-y-1">
            {summary.computedStats.symptomCorrelations.map((c, i) => (
              <li key={i} className="text-sm text-amber-700">• {c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around max-w-md mx-auto">
        <Link to="/" className="text-gray-500 text-xs">Log</Link>
        <Link to="/nutrition" className="text-gray-500 text-xs">Nutrition</Link>
        <Link to="/hydration" className="text-gray-500 text-xs">Water</Link>
        <Link to="/symptoms" className="text-gray-500 text-xs">Symptoms</Link>
        <Link to="/weekly" className="text-emerald-600 text-xs font-medium">Week</Link>
        <Link to="/settings" className="text-gray-500 text-xs">Settings</Link>
      </nav>
    </div>
  );
}
