import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FoodInput } from '../components/FoodInput';
import { RepeatMealButton } from '../components/RepeatMealButton';
import { FoodLogEntry } from '../components/FoodLogEntry';
import { api } from '../api/client';
import type { FoodLogEntry as FoodLogEntryType } from '../types';

export default function Home() {
  const [entries, setEntries] = useState<FoodLogEntryType[]>([]);
  const [recentFoods, setRecentFoods] = useState<string[]>([]);

  useEffect(() => {
    loadToday();
    loadRecent();
  }, []);

  async function loadToday() {
    try {
      const data = await api.getToday();
      setEntries(data.entries);
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

  function handleFoodLogged(entry: FoodLogEntryType) {
    setEntries(prev => [...prev, entry]);
  }

  function handleMealRepeated(newEntries: FoodLogEntryType[]) {
    setEntries(prev => [...prev, ...newEntries]);
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Log your food</h1>

      <FoodInput onFoodLogged={handleFoodLogged} />

      <RepeatMealButton onMealRepeated={handleMealRepeated} />

      {recentFoods.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {recentFoods.map(food => (
            <span key={food} className="text-sm bg-gray-100 rounded-full px-3 py-1 text-gray-600">
              {food}
            </span>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-2">Today</h2>
          {entries.map(entry => (
            <FoodLogEntry key={entry.timestamp} entry={entry} />
          ))}
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around max-w-md mx-auto">
        <Link to="/" className="text-emerald-600 text-xs font-medium">Log</Link>
        <Link to="/nutrition" className="text-gray-500 text-xs">Nutrition</Link>
        <Link to="/hydration" className="text-gray-500 text-xs">Water</Link>
        <Link to="/symptoms" className="text-gray-500 text-xs">Symptoms</Link>
        <Link to="/weekly" className="text-gray-500 text-xs">Week</Link>
        <Link to="/settings" className="text-gray-500 text-xs">Settings</Link>
      </nav>
    </div>
  );
}
