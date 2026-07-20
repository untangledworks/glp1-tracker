interface NarrativeCardProps {
  narrative: string;
  suggestions?: string[];
}

export function NarrativeCard({ narrative, suggestions }: NarrativeCardProps) {
  return (
    <div className="bg-linen rounded-2xl p-5 border-l-4 border-sage space-y-3">
      <p className="text-forest leading-relaxed">{narrative}</p>
      {suggestions && suggestions.length > 0 && (
        <div>
          <p className="text-xs text-forest/50 font-medium mb-2">Quick wins:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <span key={i} className="text-sm bg-white/70 rounded-full px-3 py-1 text-forest/80">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
