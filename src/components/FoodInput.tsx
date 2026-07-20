import { useState } from 'react';
import { api } from '../api/client';
import type { FoodLogEntry } from '../types';

interface FoodInputProps {
  onFoodLogged: (entry: FoodLogEntry) => void;
}

export function FoodInput({ onFoodLogged }: FoodInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const { macros, resolvedName } = await api.parseFood(input.trim());
      const { entry } = await api.logFood({ rawInput: input.trim(), resolvedName, macros });
      onFoodLogged(entry);
      setInput('');
    } catch (err) {
      console.error('Failed to log food:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="What did you eat?"
        disabled={isLoading}
        className="w-full bg-white border border-forest/10 rounded-2xl px-4 py-3.5 text-lg placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage disabled:opacity-50 transition-shadow"
      />
      {isLoading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </form>
  );
}
