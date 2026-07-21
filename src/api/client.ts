import { fetchAuthSession } from 'aws-amplify/auth';
import type { Macros, FoodLogEntry, HydrationLogEntry, SymptomLogEntry, NutritionStatus, MealSlot } from '../types';
import { mockApi } from './mock-client';
import outputs from '../../amplify_outputs.json';

const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

const API_BASE = (outputs as any)?.custom?.apiUrl?.replace(/\/$/, '') || import.meta.env.VITE_API_URL || '';

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

const realApi = {
  parseFood(rawInput: string): Promise<{ macros: Macros; resolvedName: string }> {
    return authFetch('/parse-food', { method: 'POST', body: JSON.stringify({ rawInput }) });
  },

  logFood(data: { rawInput: string; resolvedName: string; macros: Macros; mealSlot?: MealSlot; dictionaryRef?: string }): Promise<{ entry: FoodLogEntry }> {
    const localDate = new Date().toLocaleDateString('en-CA');
    return authFetch('/log-food', { method: 'POST', body: JSON.stringify({ ...data, localDate }) });
  },

  deleteFood(timestamp: string): Promise<{ deleted: boolean }> {
    return authFetch('/delete-food', { method: 'POST', body: JSON.stringify({ timestamp }) });
  },

  deleteHydration(timestamp: string): Promise<{ deleted: boolean }> {
    return authFetch('/delete-hydration', { method: 'POST', body: JSON.stringify({ timestamp }) });
  },

  logHydration(vesselType: string, oz: number): Promise<{ entry: HydrationLogEntry }> {
    const localDate = new Date().toLocaleDateString('en-CA');
    return authFetch('/log-hydration', { method: 'POST', body: JSON.stringify({ vesselType, oz, localDate }) });
  },

  logSymptoms(data: {
    date: string;
    injectionDay: boolean;
    injectionSite?: string;
    symptoms: Record<string, number>;
    supplementsTaken?: boolean;
    sleepBedTime?: string;
    sleepWakeTime?: string;
  }): Promise<{ entry: SymptomLogEntry }> {
    return authFetch('/log-symptoms', { method: 'POST', body: JSON.stringify(data) });
  },

  getSymptoms(date?: string): Promise<{ entry: SymptomLogEntry | null }> {
    const params = date ? `?date=${date}` : '';
    return authFetch(`/get-symptoms${params}`);
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

  saveSettings(settings: Record<string, any>): Promise<{ settings: Record<string, any> }> {
    return authFetch('/save-settings', { method: 'POST', body: JSON.stringify(settings) });
  },

  getSettings(): Promise<{ settings: Record<string, any> }> {
    return authFetch('/get-settings');
  },

  getWeeklySummary(): Promise<{ summary: { narrativeText: string; computedStats: any } }> {
    return authFetch('/get-weekly-summary');
  },
};

export const api = IS_MOCK ? mockApi : realApi;
