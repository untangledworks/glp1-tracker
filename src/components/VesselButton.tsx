interface VesselButtonProps {
  name: string;
  oz: number;
  onTap: () => void;
  disabled?: boolean;
}

export function VesselButton({ name, oz, onTap, disabled }: VesselButtonProps) {
  const icon = name === 'bottle' ? '🫗' : '🥛';

  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className="flex flex-col items-center gap-1 border-2 border-blue-200 rounded-xl p-4 hover:bg-blue-50 active:scale-95 transition-transform disabled:opacity-50"
    >
      <span className="text-3xl">{icon}</span>
      <span className="font-medium text-gray-800 capitalize">{name}</span>
      <span className="text-sm text-gray-500">{oz} oz</span>
    </button>
  );
}
