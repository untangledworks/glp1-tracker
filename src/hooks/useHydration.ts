import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { HydrationLogEntry } from '../types';

export function useHydration() {
  const [entries, setEntries] = useState<HydrationLogEntry[]>([]);
  const [totalOz, setTotalOz] = useState(0);
  const [target, setTarget] = useState(64);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const data = await api.getToday();
      setEntries(data.hydration.entries);
      setTotalOz(data.hydration.totalOz);
      setTarget(data.nutrition.hydration.target);
    } catch (err) {
      console.error('Failed to load hydration:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function logDrink(vesselType: string, oz: number) {
    try {
      const { entry } = await api.logHydration(vesselType, oz);
      setEntries(prev => [...prev, entry]);
      setTotalOz(prev => prev + oz);
    } catch (err) {
      console.error('Failed to log hydration:', err);
    }
  }

  async function deleteDrink(timestamp: string, oz: number) {
    try {
      await api.deleteHydration(timestamp);
      setEntries(prev => prev.filter(e => e.timestamp !== timestamp));
      setTotalOz(prev => prev - oz);
    } catch (err) {
      console.error('Failed to delete hydration:', err);
    }
  }

  return { entries, totalOz, target, isLoading, logDrink, deleteDrink };
}
