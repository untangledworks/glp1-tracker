interface QualitativeProgressProps {
  label: string;
  statusLabel: string;
  color: 'green' | 'yellow' | 'red';
  current: number;
  target: number;
}

const colorMap = {
  green: { bar: 'bg-sage', text: 'text-sage-dark', track: 'bg-sage-light' },
  yellow: { bar: 'bg-honey', text: 'text-honey', track: 'bg-honey/10' },
  red: { bar: 'bg-red-400', text: 'text-red-600', track: 'bg-red-50' },
};

export function QualitativeProgress({ label, statusLabel, color, current, target }: QualitativeProgressProps) {
  const ratio = Math.min(current / target, 1);
  const colors = colorMap[color];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-forest">{label}</span>
      </div>
      <div className={`h-2.5 ${colors.track} rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500 ease-out`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className={`text-sm ${colors.text}`}>{statusLabel}</p>
    </div>
  );
}
