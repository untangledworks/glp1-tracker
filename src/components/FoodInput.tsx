import { useState } from 'react';
import { api } from '../api/client';
import type { FoodLogEntry } from '../types';

interface FoodInputProps {
  onFoodLogged: (entry: FoodLogEntry) => void;
  onOptimisticAdd?: (tempEntry: FoodLogEntry) => void;
}

export function FoodInput({ onFoodLogged, onOptimisticAdd }: FoodInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      mealSlot: 'SNACK',
      dictionaryRef: null,
    };
    onOptimisticAdd?.(tempEntry);

    try {
      const { macros, resolvedName } = await api.parseFood(rawInput);
      const { entry } = await api.logFood({ rawInput, resolvedName, macros });
      onFoodLogged(entry);
    } catch (err) {
      console.error('Failed to log food:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
  );
}
