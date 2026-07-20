import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') || '');
  const [diet, setDiet] = useState(localStorage.getItem('dietaryPreference') || 'no restrictions');
  const [vessels, setVessels] = useState(
    JSON.parse(localStorage.getItem('hydrationVessels') || '[{"name":"glass","oz":12},{"name":"bottle","oz":24}]')
  );
  const [injectionDay, setInjectionDay] = useState(localStorage.getItem('injectionDayOfWeek') || '');
  const [sleepTracking, setSleepTracking] = useState(localStorage.getItem('sleepTrackingEnabled') === 'true');
  const [saved, setSaved] = useState(false);

  function updateVessel(index: number, field: 'name' | 'oz', value: string | number) {
    const updated = [...vessels];
    updated[index] = { ...updated[index], [field]: field === 'oz' ? Number(value) : value };
    setVessels(updated);
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem('displayName', displayName);
    localStorage.setItem('dietaryPreference', diet);
    localStorage.setItem('hydrationVessels', JSON.stringify(vessels));
    if (injectionDay) {
      localStorage.setItem('injectionDayOfWeek', injectionDay);
    } else {
      localStorage.removeItem('injectionDayOfWeek');
    }
    localStorage.setItem('sleepTrackingEnabled', sleepTracking ? 'true' : 'false');
    setSaved(true);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/onboarding');
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-forest/60">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
            placeholder="What should we call you?"
            className="w-full bg-ivory border border-forest/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-forest/60">Dietary preference</label>
          <select
            value={diet}
            onChange={(e) => { setDiet(e.target.value); setSaved(false); }}
            className="w-full bg-ivory border border-forest/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
          >
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="pescatarian">Pescatarian</option>
            <option value="no restrictions">No restrictions</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-forest/60">Water vessels</label>
          {vessels.map((v: { name: string; oz: number }, i: number) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={v.name}
                onChange={(e) => updateVessel(i, 'name', e.target.value)}
                className="flex-1 bg-ivory border border-forest/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
              <input
                type="number"
                value={v.oz}
                onChange={(e) => updateVessel(i, 'oz', e.target.value)}
                className="w-20 bg-ivory border border-forest/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
              <span className="self-center text-sm text-forest/40">oz</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-forest/60">Injection day</label>
          <select
            value={injectionDay}
            onChange={(e) => { setInjectionDay(e.target.value); setSaved(false); }}
            className="w-full bg-ivory border border-forest/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
          >
            <option value="">Not set</option>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-forest/60">Track sleep</p>
            <p className="text-xs text-forest/40">Log bed & wake times</p>
          </div>
          <button
            onClick={() => { setSleepTracking(!sleepTracking); setSaved(false); }}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              sleepTracking ? 'bg-sage' : 'bg-forest/20'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              sleepTracking ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3.5 rounded-2xl text-base font-medium transition-all ${
          saved ? 'bg-sage-light text-sage-dark' : 'bg-sage text-white hover:bg-sage-dark'
        }`}
      >
        {saved ? 'Saved' : 'Save settings'}
      </button>

      <button
        onClick={handleSignOut}
        className="w-full py-3.5 rounded-2xl text-base font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
