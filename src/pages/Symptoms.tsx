import { useState, useEffect } from 'react';
import { SymptomSlider } from '../components/SymptomSlider';
import { api } from '../api/client';
import type { Symptoms } from '../types';

export default function Symptoms() {
  const [injectionDay, setInjectionDay] = useState(false);
  const [symptoms, setSymptoms] = useState<Symptoms>({
    nausea: 0,
    constipation: 0,
    diarrhea: 0,
    fatigue: 0,
    appetite: 0,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const sleepEnabled = localStorage.getItem('sleepTrackingEnabled') === 'true';
  const today = new Date().toISOString().split('T')[0];
  const [bedTime, setBedTime] = useState(
    () => localStorage.getItem(`sleepBedTime_${today}`) || '22:30'
  );
  const [wakeTime, setWakeTime] = useState(
    () => localStorage.getItem(`sleepWakeTime_${today}`) || '07:00'
  );

  useEffect(() => {
    api.getSymptoms(today).then(({ entry }) => {
      if (entry) {
        setSymptoms(entry.symptoms as unknown as Symptoms);
        setInjectionDay(entry.injectionDay);
        setSaved(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [today]);

  function updateSymptom(key: keyof Symptoms, value: number) {
    setSymptoms(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    try {
      const supplementsTaken = localStorage.getItem(`supplementsToday_${today}`) === 'true';

      await api.logSymptoms({
        date: today,
        injectionDay,
        symptoms: symptoms as unknown as Record<string, number>,
        supplementsTaken,
        sleepBedTime: sleepEnabled ? bedTime : undefined,
        sleepWakeTime: sleepEnabled ? wakeTime : undefined,
      });

      if (sleepEnabled) {
        localStorage.setItem(`sleepBedTime_${today}`, bedTime);
        localStorage.setItem(`sleepWakeTime_${today}`, wakeTime);
        localStorage.setItem(`sleepLoggedToday_${today}`, 'true');
      }

      setSaved(true);
    } catch (err) {
      console.error('Failed to log symptoms:', err);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12 text-forest/50">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">How are you feeling?</h1>

      {sleepEnabled && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-medium text-forest/60">Last night's sleep</h3>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-forest/50">Bed time</label>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => { setBedTime(e.target.value); setSaved(false); }}
                className="w-full bg-ivory border border-forest/10 rounded-xl px-3 py-2.5 text-forest focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-forest/50">Wake time</label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => { setWakeTime(e.target.value); setSaved(false); }}
                className="w-full bg-ivory border border-forest/10 rounded-xl px-3 py-2.5 text-forest focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => { setInjectionDay(!injectionDay); setSaved(false); }}
        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${
          injectionDay ? 'bg-sage-light border border-sage/30' : 'bg-linen border border-transparent'
        }`}
      >
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
          injectionDay ? 'bg-sage border-sage' : 'border-forest/20'
        }`}>
          {injectionDay && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </div>
        <span className="text-forest/80">Injection day</span>
      </button>

      <div className="space-y-5 bg-white rounded-2xl p-5 shadow-sm">
        <SymptomSlider label="Nausea" value={symptoms.nausea} onChange={v => updateSymptom('nausea', v)} />
        <SymptomSlider label="Constipation" value={symptoms.constipation} onChange={v => updateSymptom('constipation', v)} />
        <SymptomSlider label="Diarrhea" value={symptoms.diarrhea} onChange={v => updateSymptom('diarrhea', v)} />
        <SymptomSlider label="Fatigue" value={symptoms.fatigue} onChange={v => updateSymptom('fatigue', v)} />
        <SymptomSlider label="Appetite" value={symptoms.appetite} onChange={v => updateSymptom('appetite', v)} />
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3.5 rounded-2xl text-base font-medium transition-all ${
          saved ? 'bg-sage-light text-sage-dark' : 'bg-sage text-white hover:bg-sage-dark'
        }`}
      >
        {saved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
}
