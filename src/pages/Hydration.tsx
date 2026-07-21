import { VesselButton } from '../components/VesselButton';
import { useHydration } from '../hooks/useHydration';

export default function Hydration() {
  const { entries, totalOz, target, isLoading, logDrink, deleteDrink } = useHydration();
  const ratio = Math.min(totalOz / target, 1);

  const vessels = JSON.parse(localStorage.getItem('hydrationVessels') || '[{"name":"glass","oz":12},{"name":"bottle","oz":24}]');

  if (isLoading) {
    return <div className="text-forest/40">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Hydration</h1>

      <div className="flex justify-center gap-4">
        {vessels.map((v: { name: string; oz: number }) => (
          <VesselButton
            key={v.name}
            name={v.name}
            oz={v.oz}
            onTap={() => logDrink(v.name, v.oz)}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-forest/60">{totalOz} oz today</span>
          <span className="font-medium text-sky-600">{Math.round(ratio * 100)}%</span>
        </div>
        <div className="h-3 bg-sky-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-500 ease-out"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-medium text-forest/50 uppercase tracking-wide mb-2">Log</h2>
          {entries.map((entry) => (
            <div key={entry.timestamp} className="flex items-center gap-3 text-sm text-forest/60">
              <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z" />
              </svg>
              <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              <span className="flex-1 text-forest/40">{entry.oz} oz</span>
              <button
                onClick={() => deleteDrink(entry.timestamp, entry.oz)}
                className="text-xs text-forest/30 hover:text-forest/60 px-2 py-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
