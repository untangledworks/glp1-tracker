interface SymptomSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const severityLabels = ['None', 'Mild', 'Moderate', 'Severe'];

export function SymptomSlider({ label, value, onChange }: SymptomSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{severityLabels[value]}</span>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              value === level
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {severityLabels[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
