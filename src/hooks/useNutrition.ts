import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { NutritionStatus, FoodLogEntry } from '../types';

export function useNutrition() {
  const [nutrition, setNutrition] = useState<NutritionStatus | null>(null);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [narrative, setNarrative] = useState<{ narrative: string; suggestions: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const [todayData, narrativeData] = await Promise.all([
        api.getToday(),
        api.getDailyNarrative(),
      ]);
      setNutrition(todayData.nutrition);
      setEntries(todayData.entries);
      setNarrative(narrativeData);
    } catch (err) {
      console.error('Failed to load nutrition:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return { nutrition, entries, narrative, isLoading, refresh: load };
}
