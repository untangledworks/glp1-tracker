interface VesselButtonProps {
  name: string;
  oz: number;
  onTap: () => void;
  disabled?: boolean;
}

export function VesselButton({ name, oz, onTap, disabled }: VesselButtonProps) {
  const isBottle = name.toLowerCase().includes('bottle');

  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className="flex flex-col items-center gap-2 bg-white border border-sky-100 rounded-2xl p-5 hover:border-sky-300 hover:shadow-sm active:scale-95 transition-all disabled:opacity-50"
    >
      {isBottle ? <BottleIcon /> : <GlassIcon />}
      <span className="font-medium text-forest capitalize">{name}</span>
      <span className="text-sm text-forest/50">{oz} oz</span>
    </button>
  );
}

function GlassIcon() {
  return (
    <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
      {/* Glass outline - tapered tumbler */}
      <path
        d="M14 8h20l-3 32H17L14 8z"
        stroke="#0284c7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Water fill - half */}
      <path
        d="M16.5 24h15l-1.5 16H18L16.5 24z"
        fill="#7dd3fc"
        opacity="0.6"
      />
      {/* Water surface wave */}
      <path
        d="M16.5 24c2 1 4-1 7.5 0s5.5 1 8 0"
        stroke="#0284c7"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Drops spilling out */}
      <circle cx="36" cy="14" r="1.5" fill="#7dd3fc" />
      <circle cx="38" cy="18" r="1" fill="#7dd3fc" />
      <circle cx="35" cy="21" r="1.2" fill="#7dd3fc" />
    </svg>
  );
}

function BottleIcon() {
  return (
    <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
      {/* Bottle neck */}
      <path
        d="M21 6h6v4c2 1 3 3 3 5v23a4 4 0 01-4 4h-4a4 4 0 01-4-4V15c0-2 1-4 3-5V6z"
        stroke="#0284c7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cap / rim */}
      <rect x="20" y="4" width="8" height="3" rx="1" stroke="#0284c7" strokeWidth="1.5" fill="none" />
      {/* Water fill */}
      <path
        d="M19 20h10v18a4 4 0 01-4 4h-2a4 4 0 01-4-4V20z"
        fill="#7dd3fc"
        opacity="0.5"
      />
      {/* Water surface */}
      <path
        d="M19 20c1.5 1 3-0.5 5 0.5s3.5 0 5-0.5"
        stroke="#0284c7"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Glass shine line */}
      <path
        d="M20 14v20"
        stroke="white"
        strokeWidth="1"
        opacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
