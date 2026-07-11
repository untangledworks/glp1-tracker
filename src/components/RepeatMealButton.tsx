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
        className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-4 text-lg font-medium text-emerald-800 disabled:opacity-50"
      >
        {isLoading ? 'Repeating...' : `Repeat Yesterday's ${mealLabel(contextualMeal)}`}
      </button>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="text-sm text-emerald-600 pl-1"
        >
          ▸ Repeat a different meal
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {otherSlots.map(slot => (
            <button
              key={slot}
              onClick={() => handleRepeat(slot)}
              disabled={isLoading}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-emerald-400"
            >
              {mealLabel(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
