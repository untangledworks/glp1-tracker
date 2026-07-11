interface NarrativeCardProps {
  narrative: string;
  suggestions?: string[];
}

export function NarrativeCard({ narrative, suggestions }: NarrativeCardProps) {
  return (
    <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
      <p className="text-gray-800 text-sm leading-relaxed">{narrative}</p>
      {suggestions && suggestions.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Quick fixes (5 min prep):</p>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-sm text-gray-700">• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
