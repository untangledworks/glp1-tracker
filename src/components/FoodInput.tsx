import { useState } from 'react';
import { api } from '../api/client';
import type { FoodLogEntry, MealSlot } from '../types';

const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'DINNER', label: 'Dinner' },
];

function inferLocalMealSlot(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

interface FoodInputProps {
  onFoodLogged: (entry: FoodLogEntry) => void;
  onOptimisticAdd?: (tempEntry: FoodLogEntry) => void;
}

export function FoodInput({ onFoodLogged, onOptimisticAdd }: FoodInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mealSlot, setMealSlot] = useState<MealSlot>(inferLocalMealSlot);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const rawInput = input.trim();
    setInput('');
    setIsLoading(true);

    const tempEntry: FoodLogEntry = {
      owner: '',
      timestamp: new Date().toISOString(),
      rawInput,
      resolvedName: rawInput,
      macros: { protein: 0, carbs: 0, fat: 0, fiber: 0, calories: 0 },
      mealSlot,
      dictionaryRef: null,
    };
    onOptimisticAdd?.(tempEntry);

    try {
      const { macros, resolvedName } = await api.parseFood(rawInput);
      const { entry } = await api.logFood({ rawInput, resolvedName, macros, mealSlot });
      onFoodLogged(entry);
    } catch (err) {
      console.error('Failed to log food:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {MEAL_SLOTS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMealSlot(value)}
            className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
              mealSlot === value
                ? 'bg-sage text-white'
                : 'bg-linen text-forest/60 hover:bg-sage-light'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What did you eat?"
          disabled={isLoading}
          className="flex-1 bg-white border border-forest/10 rounded-2xl px-4 py-3.5 text-lg placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage disabled:opacity-50 transition-shadow"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-sage text-white px-5 rounded-2xl text-base font-medium disabled:opacity-40 hover:bg-sage-dark active:scale-95 transition-all shrink-0"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Add'
          )}
        </button>
      </form>
    </div>
  );
}
