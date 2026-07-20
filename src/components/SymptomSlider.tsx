interface SymptomSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const severityLabels = ['None', 'Mild', 'Moderate', 'Severe'];

export function SymptomSlider({ label, value, onChange }: SymptomSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-forest">{label}</span>
        <span className="text-xs text-forest/40">{severityLabels[value]}</span>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
              value === level
                ? 'bg-sage text-white shadow-sm'
                : 'bg-linen text-forest/50 hover:bg-sage-light'
            }`}
          >
            {severityLabels[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
