import { useState } from 'react';
import { Link } from 'react-router-dom';
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

  function updateSymptom(key: keyof Symptoms, value: number) {
    setSymptoms(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    try {
      await api.logSymptoms({
        date: new Date().toISOString().split('T')[0],
        injectionDay,
        symptoms,
      });
      setSaved(true);
    } catch (err) {
      console.error('Failed to log symptoms:', err);
    }
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">How are you feeling?</h1>

      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
        <button
          onClick={() => {
            setInjectionDay(!injectionDay);
            setSaved(false);
          }}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
            injectionDay ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}
        >
          {injectionDay && <span className="text-white text-xs">✓</span>}
        </button>
        <span className="text-gray-700">Injection day</span>
      </div>

      <div className="space-y-5">
        <SymptomSlider
          label="Nausea"
          value={symptoms.nausea}
          onChange={v => updateSymptom('nausea', v)}
        />
        <SymptomSlider
          label="Constipation"
          value={symptoms.constipation}
          onChange={v => updateSymptom('constipation', v)}
        />
        <SymptomSlider
          label="Diarrhea"
          value={symptoms.diarrhea}
          onChange={v => updateSymptom('diarrhea', v)}
        />
        <SymptomSlider
          label="Fatigue"
          value={symptoms.fatigue}
          onChange={v => updateSymptom('fatigue', v)}
        />
        <SymptomSlider
          label="Appetite"
          value={symptoms.appetite}
          onChange={v => updateSymptom('appetite', v)}
        />
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-lg font-medium transition-colors ${
          saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white'
        }`}
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around max-w-md mx-auto">
        <Link to="/" className="text-gray-500 text-xs">
          Log
        </Link>
        <Link to="/nutrition" className="text-gray-500 text-xs">
          Nutrition
        </Link>
        <Link to="/hydration" className="text-gray-500 text-xs">
          Water
        </Link>
        <Link to="/symptoms" className="text-emerald-600 text-xs font-medium">
          Symptoms
        </Link>
        <Link to="/weekly" className="text-gray-500 text-xs">
          Week
        </Link>
        <Link to="/settings" className="text-gray-500 text-xs">
          Settings
        </Link>
      </nav>
    </div>
  );
}
