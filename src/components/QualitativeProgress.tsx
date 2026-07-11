interface QualitativeProgressProps {
  label: string;
  statusLabel: string;
  color: 'green' | 'yellow' | 'red';
  current: number;
  target: number;
}

const colorMap = {
  green: { bg: 'bg-emerald-500', text: 'text-emerald-700', icon: '🟢' },
  yellow: { bg: 'bg-amber-400', text: 'text-amber-700', icon: '🟡' },
  red: { bg: 'bg-red-400', text: 'text-red-700', icon: '🔴' },
};

export function QualitativeProgress({ label, statusLabel, color, current, target }: QualitativeProgressProps) {
  const ratio = Math.min(current / target, 1);
  const colors = colorMap[color];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span>{colors.icon}</span>
        <span className="font-medium text-gray-800">{label}</span>
      </div>
      <p className={`text-sm ${colors.text} pl-7`}>{statusLabel}</p>
      <div className="h-2 bg-gray-100 rounded-full ml-7">
        <div
          className={`h-2 rounded-full ${colors.bg} transition-all`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
