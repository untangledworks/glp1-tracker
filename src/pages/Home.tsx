import { useEffect, useState } from 'react';
import { FoodInput } from '../components/FoodInput';
import { RepeatMealButton } from '../components/RepeatMealButton';
import { FoodLogEntry } from '../components/FoodLogEntry';
import { QualitativeProgress } from '../components/QualitativeProgress';
import { InjectionBadge } from '../components/InjectionBadge';
import { SupplementToggle } from '../components/SupplementToggle';
import { SleepCard } from '../components/SleepCard';
import { getGreeting } from '../utils/greeting';
import { api } from '../api/client';
import type { FoodLogEntry as FoodLogEntryType, NutritionStatus } from '../types';

export default function Home() {
  const [entries, setEntries] = useState<FoodLogEntryType[]>([]);
  const [recentFoods, setRecentFoods] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState<NutritionStatus | null>(null);

  useEffect(() => {
    loadToday();
    loadRecent();
  }, []);

  async function loadToday() {
    try {
      const data = await api.getToday();
      setEntries(data.entries);
      setNutrition(data.nutrition);
    } catch (err) {
      console.error('Failed to load today:', err);
    }
  }

  async function loadRecent() {
    try {
      const data = await api.getRecentFoods();
      setRecentFoods(data.foods.slice(0, 5).map(f => f.foodAlias));
    } catch (err) {
      console.error('Failed to load recent foods:', err);
    }
  }

  function handleOptimisticAdd(tempEntry: FoodLogEntryType) {
    setEntries(prev => [...prev, { ...tempEntry, _pending: true } as any]);
  }

  function handleFoodLogged(entry: FoodLogEntryType) {
    setEntries(prev => {
      const withoutPending = prev.filter((e: any) => !e._pending);
      return [...withoutPending, entry];
    });
    loadToday();
  }

  function handleMealRepeated(newEntries: FoodLogEntryType[]) {
    setEntries(prev => [...prev, ...newEntries]);
    loadToday();
  }

  async function quickLog(food: string) {
    try {
      const { macros, resolvedName } = await api.parseFood(food);
      const { entry } = await api.logFood({ rawInput: food, resolvedName, macros });
      setEntries(prev => [...prev, entry]);
      loadToday();
    } catch (err) {
      console.error('Failed to quick-log food:', err);
    }
  }

  const displayName = localStorage.getItem('displayName');
  const greeting = getGreeting(displayName);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">{greeting}</h1>
        <div className="mt-2">
          <InjectionBadge />
        </div>
      </div>

      <SupplementToggle />

      <SleepCard />

      {nutrition && (
        <div className="space-y-4 bg-white rounded-2xl p-5 shadow-sm">
          <QualitativeProgress
            label="Protein"
            statusLabel={nutrition.protein.label}
            color={nutrition.protein.color}
            current={nutrition.protein.current}
            target={nutrition.protein.target}
          />
          <QualitativeProgress
            label="Fiber"
            statusLabel={nutrition.fiber.label}
            color={nutrition.fiber.color}
            current={nutrition.fiber.current}
            target={nutrition.fiber.target}
          />
          <QualitativeProgress
            label="Hydration"
            statusLabel={nutrition.hydration.label}
            color={nutrition.hydration.color}
            current={nutrition.hydration.current}
            target={nutrition.hydration.target}
          />
        </div>
      )}

      <FoodInput onFoodLogged={handleFoodLogged} onOptimisticAdd={handleOptimisticAdd} />

      <RepeatMealButton onMealRepeated={handleMealRepeated} />

      {recentFoods.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {recentFoods.map(food => (
            <button
              key={food}
              onClick={() => quickLog(food)}
              className="text-sm bg-linen rounded-full px-3 py-1.5 text-forest/70 hover:bg-sage-light active:scale-95 transition-all"
            >
              {food}
            </button>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-forest/50 uppercase tracking-wide mb-3">Today</h2>
          <div className="space-y-1">
            {entries.map(entry => (
              <FoodLogEntry
                key={entry.timestamp}
                entry={entry}
                onDeleted={(ts) => {
                  setEntries(prev => prev.filter(e => e.timestamp !== ts));
                  loadToday();
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
