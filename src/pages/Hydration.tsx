import { Link } from 'react-router-dom';
import { VesselButton } from '../components/VesselButton';
import { useHydration } from '../hooks/useHydration';

export default function Hydration() {
  const { entries, totalOz, target, isLoading, logDrink } = useHydration();
  const ratio = Math.min(totalOz / target, 1);

  const vessels = JSON.parse(localStorage.getItem('hydrationVessels') || '[{"name":"glass","oz":12},{"name":"bottle","oz":24}]');

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">Hydration</h1>

      <div className="flex justify-center gap-6">
        {vessels.map((v: { name: string; oz: number }) => (
          <VesselButton
            key={v.name}
            name={v.name}
            oz={v.oz}
            onTap={() => logDrink(v.name, v.oz)}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Today: {totalOz} oz</span>
          <span>{Math.round(ratio * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.timestamp} className="flex items-center gap-2 text-sm text-gray-600">
              <span>{entry.vesselType === 'bottle' ? '🫗' : '🥛'}</span>
              <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around max-w-md mx-auto">
        <Link to="/" className="text-gray-500 text-xs">Log</Link>
        <Link to="/nutrition" className="text-gray-500 text-xs">Nutrition</Link>
        <Link to="/hydration" className="text-blue-600 text-xs font-medium">Water</Link>
        <Link to="/symptoms" className="text-gray-500 text-xs">Symptoms</Link>
        <Link to="/weekly" className="text-gray-500 text-xs">Week</Link>
        <Link to="/settings" className="text-gray-500 text-xs">Settings</Link>
      </nav>
    </div>
  );
}
