import { fetchAuthSession } from 'aws-amplify/auth';
import type { Macros, FoodLogEntry, HydrationLogEntry, SymptomLogEntry, NutritionStatus, MealSlot } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString() || '';

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  parseFood(rawInput: string): Promise<{ macros: Macros; resolvedName: string }> {
    return authFetch('/parse-food', { method: 'POST', body: JSON.stringify({ rawInput }) });
  },

  logFood(data: { rawInput: string; resolvedName: string; macros: Macros; mealSlot?: MealSlot; dictionaryRef?: string }): Promise<{ entry: FoodLogEntry }> {
    return authFetch('/log-food', { method: 'POST', body: JSON.stringify(data) });
  },

  logHydration(vesselType: string, oz: number): Promise<{ entry: HydrationLogEntry }> {
    return authFetch('/log-hydration', { method: 'POST', body: JSON.stringify({ vesselType, oz }) });
  },

  logSymptoms(data: { date: string; injectionDay: boolean; symptoms: Record<string, number> }): Promise<{ entry: SymptomLogEntry }> {
    return authFetch('/log-symptoms', { method: 'POST', body: JSON.stringify(data) });
  },

  getToday(date?: string): Promise<{ nutrition: NutritionStatus; entries: FoodLogEntry[]; hydration: { totalOz: number; entries: HydrationLogEntry[] } }> {
    const params = date ? `?date=${date}` : '';
    return authFetch(`/get-today${params}`);
  },

  getRecentFoods(): Promise<{ foods: { foodAlias: string; lastUsed: string; useCount: number }[] }> {
    return authFetch('/get-recent-foods');
  },

  repeatMeal(mealSlot: MealSlot, sourceDate?: string): Promise<{ entries: FoodLogEntry[] }> {
    return authFetch('/repeat-meal', { method: 'POST', body: JSON.stringify({ mealSlot, sourceDate }) });
  },

  updateFoodDictionary(data: { foodAlias: string; components?: { item: string; qty: string }[]; macros: Macros }): Promise<{ entry: any }> {
    return authFetch('/update-food-dictionary', { method: 'PUT', body: JSON.stringify(data) });
  },

  getDailyNarrative(date?: string): Promise<{ narrative: string; suggestions: string[] }> {
    const params = date ? `?date=${date}` : '';
    return authFetch(`/generate-daily-narrative${params}`);
  },

  getWeeklySummary(): Promise<{ summary: { narrativeText: string; computedStats: any } }> {
    return authFetch('/get-weekly-summary');
  },
};
