import { useState } from 'react';
import { api } from '../api/client';
import type { FoodLogEntry, MealSlot } from '../types';

interface RepeatMealButtonProps {
  onMealRepeated: (entries: FoodLogEntry[]) => void;
}

function getContextualMeal(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

function mealLabel(slot: MealSlot): string {
  return slot.charAt(0) + slot.slice(1).toLowerCase();
}

export function RepeatMealButton({ onMealRepeated }: RepeatMealButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const contextualMeal = getContextualMeal();

  async function handleRepeat(slot: MealSlot) {
    setIsLoading(true);
    try {
      const { entries } = await api.repeatMeal(slot);
      onMealRepeated(entries);
      setExpanded(false);
    } catch (err) {
      console.error('Failed to repeat meal:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const allSlots: MealSlot[] = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
  const otherSlots = allSlots.filter(s => s !== contextualMeal);

  return (
    <div className="space-y-2">
      <button
        onClick={() => handleRepeat(contextualMeal)}
        disabled={isLoading}
        className="w-full bg-sage-light border border-sage/20 rounded-2xl px-4 py-4 text-base font-medium text-sage-dark disabled:opacity-50 hover:bg-sage-light/80 transition-colors"
      >
        {isLoading ? 'Repeating...' : `Repeat yesterday's ${mealLabel(contextualMeal)}`}
      </button>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="text-sm text-sage pl-1 hover:text-sage-dark transition-colors"
        >
          Other meals...
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {otherSlots.map(slot => (
            <button
              key={slot}
              onClick={() => handleRepeat(slot)}
              disabled={isLoading}
              className="border border-forest/10 rounded-xl px-3 py-2.5 text-sm text-forest/70 hover:border-sage hover:bg-sage-light/50 transition-colors"
            >
              {mealLabel(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
