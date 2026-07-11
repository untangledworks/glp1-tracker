import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

export default function Settings() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') || '');
  const [diet, setDiet] = useState(localStorage.getItem('dietaryPreference') || 'no restrictions');
  const [vessels, setVessels] = useState(
    JSON.parse(localStorage.getItem('hydrationVessels') || '[{"name":"glass","oz":12},{"name":"bottle","oz":24}]')
  );
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
    setSaved(true);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/onboarding');
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">Settings</h1>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
          placeholder="What should we call you?"
          className="w-full border border-gray-300 rounded-xl px-4 py-3"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Dietary preference</label>
        <select
          value={diet}
          onChange={(e) => { setDiet(e.target.value); setSaved(false); }}
          className="w-full border border-gray-300 rounded-xl px-4 py-3"
        >
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="pescatarian">Pescatarian</option>
          <option value="no restrictions">No restrictions</option>
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-600">Water vessels</label>
        {vessels.map((v: { name: string; oz: number }, i: number) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={v.name}
              onChange={(e) => updateVessel(i, 'name', e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={v.oz}
              onChange={(e) => updateVessel(i, 'oz', e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="self-center text-sm text-gray-500">oz</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-lg font-medium ${
          saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white'
        }`}
      >
        {saved ? 'Saved ✓' : 'Save settings'}
      </button>

      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl text-lg font-medium border border-red-300 text-red-600"
      >
        Sign out
      </button>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around max-w-md mx-auto">
        <Link to="/" className="text-gray-500 text-xs">Log</Link>
        <Link to="/nutrition" className="text-gray-500 text-xs">Nutrition</Link>
        <Link to="/hydration" className="text-gray-500 text-xs">Water</Link>
        <Link to="/symptoms" className="text-gray-500 text-xs">Symptoms</Link>
        <Link to="/weekly" className="text-gray-500 text-xs">Week</Link>
        <Link to="/settings" className="text-emerald-600 text-xs font-medium">Settings</Link>
      </nav>
    </div>
  );
}
