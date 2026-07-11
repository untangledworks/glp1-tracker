import { Link } from 'react-router-dom';
import { QualitativeProgress } from '../components/QualitativeProgress';
import { NarrativeCard } from '../components/NarrativeCard';
import { useNutrition } from '../hooks/useNutrition';

export default function Nutrition() {
  const { nutrition, narrative, isLoading } = useNutrition();

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">Today's Nutrition</h1>

      {nutrition && (
        <div className="space-y-4">
          <QualitativeProgress
            label="Protein"
            statusLabel={nutrition.protein.label}
            color={nutrition.protein.color}
            current={nutrition.protein.current}
            target={nutrition.protein.target}
          />
          <QualitativeProgress
            label="Hydration"
            statusLabel={nutrition.hydration.label}
            color={nutrition.hydration.color}
            current={nutrition.hydration.current}
            target={nutrition.hydration.target}
          />
          <QualitativeProgress
            label="Fiber"
            statusLabel={nutrition.fiber.label}
            color={nutrition.fiber.color}
            current={nutrition.fiber.current}
            target={nutrition.fiber.target}
          />
        </div>
      )}

      {narrative && (
        <NarrativeCard
          narrative={narrative.narrative}
          suggestions={narrative.suggestions}
        />
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around max-w-md mx-auto">
        <Link to="/" className="text-gray-500 text-xs">Log</Link>
        <Link to="/nutrition" className="text-emerald-600 text-xs font-medium">Nutrition</Link>
        <Link to="/hydration" className="text-gray-500 text-xs">Water</Link>
        <Link to="/symptoms" className="text-gray-500 text-xs">Symptoms</Link>
        <Link to="/weekly" className="text-gray-500 text-xs">Week</Link>
        <Link to="/settings" className="text-gray-500 text-xs">Settings</Link>
      </nav>
    </div>
  );
}
