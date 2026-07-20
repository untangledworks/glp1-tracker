import { QualitativeProgress } from '../components/QualitativeProgress';
import { NarrativeCard } from '../components/NarrativeCard';
import { useNutrition } from '../hooks/useNutrition';

export default function Nutrition() {
  const { nutrition, narrative, isLoading } = useNutrition();

  if (isLoading) {
    return <div className="text-forest/40">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Today's Nutrition</h1>

      {nutrition && (
        <div className="space-y-5 bg-white rounded-2xl p-5 shadow-sm">
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
    </div>
  );
}
