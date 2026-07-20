# Sub-Plan 3: Frontend PWA

> Part of [GLP-1 Tracker MVP](./2026-07-09-glp1-tracker-mvp.md). Execute tasks in order. Depends on Sub-Plan 1 (auth + types) and Sub-Plan 2 (API endpoints).

---

### Task 1: Auth Provider + API Client Setup

**Files:**
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/hooks/useAuth.ts`
- Create: `src/api/client.ts`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: Amplify auth config from Sub-Plan 1; Lambda endpoints from Sub-Plan 2
- Produces: `useAuth()` hook returning `{ user, signIn, signOut, isAuthenticated }`; `api` client with typed methods for all endpoints

- [ ] **Step 1: Configure Amplify in main.tsx**

`src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App';
import './index.css';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Create AuthProvider**

`src/auth/AuthProvider.tsx`:
```typescript
import { createContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, signUp, fetchAuthSession } from 'aws-amplify/auth';

interface AuthUser {
  userId: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentUser();
      setUser({ userId: currentUser.userId, email: currentUser.signInDetails?.loginId || '' });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn(email: string, password: string) {
    await signIn({ username: email, password });
    await checkAuth();
  }

  async function handleSignUp(email: string, password: string) {
    await signUp({ username: email, password });
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
  }

  async function getToken(): Promise<string> {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || '';
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Create useAuth hook**

`src/hooks/useAuth.ts`:
```typescript
import { useContext } from 'react';
import { AuthContext } from '../auth/AuthProvider';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

- [ ] **Step 4: Create API client**

`src/api/client.ts`:
```typescript
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
```

- [ ] **Step 5: Wire up App.tsx with router and auth**

`src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Nutrition from './pages/Nutrition';
import Hydration from './pages/Hydration';
import Symptoms from './pages/Symptoms';
import WeeklySummary from './pages/WeeklySummary';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/onboarding" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
            <Route path="/hydration" element={<ProtectedRoute><Hydration /></ProtectedRoute>} />
            <Route path="/symptoms" element={<ProtectedRoute><Symptoms /></ProtectedRoute>} />
            <Route path="/weekly" element={<ProtectedRoute><WeeklySummary /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Create placeholder pages (so the app compiles)**

Create each file as a minimal component:

`src/pages/Onboarding.tsx`:
```typescript
export default function Onboarding() {
  return <div className="p-4"><h1 className="text-xl font-bold">Welcome</h1></div>;
}
```

`src/pages/Home.tsx`:
```typescript
export default function Home() {
  return <div className="p-4"><h1 className="text-xl font-bold">Log your food</h1></div>;
}
```

`src/pages/Nutrition.tsx`:
```typescript
export default function Nutrition() {
  return <div className="p-4"><h1 className="text-xl font-bold">Today's Nutrition</h1></div>;
}
```

`src/pages/Hydration.tsx`:
```typescript
export default function Hydration() {
  return <div className="p-4"><h1 className="text-xl font-bold">Hydration</h1></div>;
}
```

`src/pages/Symptoms.tsx`:
```typescript
export default function Symptoms() {
  return <div className="p-4"><h1 className="text-xl font-bold">Symptoms</h1></div>;
}
```

`src/pages/WeeklySummary.tsx`:
```typescript
export default function WeeklySummary() {
  return <div className="p-4"><h1 className="text-xl font-bold">Weekly Summary</h1></div>;
}
```

`src/pages/Settings.tsx`:
```typescript
export default function Settings() {
  return <div className="p-4"><h1 className="text-xl font-bold">Settings</h1></div>;
}
```

- [ ] **Step 7: Verify app compiles and routes work**

```bash
npx vite
```
Expected: App loads at localhost:5173, redirects to /onboarding since not authenticated.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add auth provider, API client, router, and placeholder pages"
```

---

### Task 2: Onboarding Flow

**Files:**
- Modify: `src/pages/Onboarding.tsx`

**Interfaces:**
- Consumes: `useAuth()` hook for sign-in/sign-up
- Produces: Complete 3-screen onboarding: Welcome → Sign In → Dietary Preference → redirect to Home

- [ ] **Step 1: Implement Onboarding page**

`src/pages/Onboarding.tsx`:
```typescript
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

type Step = 'welcome' | 'signin' | 'diet';

export default function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password);
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }
      setStep('diet');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  }

  async function handleDietSelect(preference: string) {
    // Save preference via API (or Amplify Data)
    localStorage.setItem('dietaryPreference', preference);
    navigate('/');
  }

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">You're on a GLP-1.</h1>
        <p className="text-lg text-gray-700 mb-2">Your appetite has changed.</p>
        <p className="text-gray-600 mb-6">
          This app helps you make sure you're getting enough of what matters:
        </p>
        <ul className="text-left text-gray-700 space-y-2 mb-8">
          <li><span className="font-medium">Protein</span> — protect muscle</li>
          <li><span className="font-medium">Fiber</span> — support digestion</li>
          <li><span className="font-medium">Hydration</span> — energy & skin</li>
        </ul>
        <p className="text-sm text-gray-500 mb-8">No calorie limits. No judgment.</p>
        <button
          onClick={() => setStep('signin')}
          className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl text-lg font-medium"
        >
          Let's go
        </button>
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-6">
        <h2 className="text-xl font-bold mb-6">{isSignUp ? 'Create account' : 'Sign in'}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg"
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-lg font-medium"
          >
            {isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-emerald-600 text-sm"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    );
  }

  if (step === 'diet') {
    const options = ['Vegetarian', 'Vegan', 'Pescatarian', 'No restrictions'];
    return (
      <div className="flex flex-col justify-center min-h-screen p-6">
        <h2 className="text-xl font-bold mb-2">Any dietary preferences?</h2>
        <p className="text-gray-600 mb-6">This helps us make better suggestions for you.</p>
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleDietSelect(option.toLowerCase())}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg text-left hover:border-emerald-500 hover:bg-emerald-50"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Verify onboarding flow**

```bash
npx vite
```
Expected: Navigate through Welcome → Sign In → Diet Preference screens. UI is clean and mobile-friendly.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Onboarding.tsx
git commit -m "feat: implement 3-screen onboarding flow (welcome, auth, diet preference)"
```

---

### Task 3: Home Page — Food Logging + Repeat Meal

**Files:**
- Modify: `src/pages/Home.tsx`
- Create: `src/components/FoodInput.tsx`
- Create: `src/components/RepeatMealButton.tsx`
- Create: `src/components/FoodLogEntry.tsx`

**Interfaces:**
- Consumes: `api.parseFood()`, `api.logFood()`, `api.repeatMeal()`, `api.getToday()`, `api.getRecentFoods()`
- Produces: Complete home screen with food input, repeat button, today's log, and recent foods

- [ ] **Step 1: Create FoodInput component**

`src/components/FoodInput.tsx`:
```typescript
import { useState } from 'react';
import { api } from '../api/client';
import type { FoodLogEntry } from '../types';

interface FoodInputProps {
  onFoodLogged: (entry: FoodLogEntry) => void;
}

export function FoodInput({ onFoodLogged }: FoodInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const { macros, resolvedName } = await api.parseFood(input.trim());
      const { entry } = await api.logFood({ rawInput: input.trim(), resolvedName, macros });
      onFoodLogged(entry);
      setInput('');
    } catch (err) {
      console.error('Failed to log food:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="What did you eat?"
        disabled={isLoading}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg pr-12 disabled:opacity-50"
      />
      {isLoading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Create RepeatMealButton component**

`src/components/RepeatMealButton.tsx`:
```typescript
import { useState } from 'react';
import { api } from '../api/client';
import type { FoodLogEntry, MealSlot } from '../types';

interface RepeatMealButtonProps {
  onMealRepeated: (entries: FoodLogEntry[]) => void;
}

function getContextualMeal(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

function mealLabel(slot: MealSlot): string {
  return slot.charAt(0) + slot.slice(1).toLowerCase();
}

export function RepeatMealButton({ onMealRepeated }: RepeatMealButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const contextualMeal = getContextualMeal();

  async function handleRepeat(slot: MealSlot) {
    setIsLoading(true);
    try {
      const { entries } = await api.repeatMeal(slot);
      onMealRepeated(entries);
      setExpanded(false);
    } catch (err) {
      console.error('Failed to repeat meal:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const allSlots: MealSlot[] = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
  const otherSlots = allSlots.filter(s => s !== contextualMeal);

  return (
    <div className="space-y-2">
      <button
        onClick={() => handleRepeat(contextualMeal)}
        disabled={isLoading}
        className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-4 text-lg font-medium text-emerald-800 disabled:opacity-50"
      >
        {isLoading ? 'Repeating...' : `Repeat Yesterday's ${mealLabel(contextualMeal)}`}
      </button>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="text-sm text-emerald-600 pl-1"
        >
          ▸ Repeat a different meal
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {otherSlots.map(slot => (
            <button
              key={slot}
              onClick={() => handleRepeat(slot)}
              disabled={isLoading}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-emerald-400"
            >
              {mealLabel(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create FoodLogEntry component**

`src/components/FoodLogEntry.tsx`:
```typescript
import type { FoodLogEntry as FoodLogEntryType } from '../types';

interface FoodLogEntryProps {
  entry: FoodLogEntryType;
}

export function FoodLogEntry({ entry }: FoodLogEntryProps) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100">
      <div>
        <span className="text-sm text-gray-500">{time}</span>
        <p className="text-gray-800">{entry.resolvedName || entry.rawInput}</p>
      </div>
      <div className="text-right text-xs text-gray-500 space-x-2">
        <span>P:{entry.macros.protein}g</span>
        <span>Fi:{entry.macros.fiber}g</span>
        <span>C:{entry.macros.carbs}g</span>
        <span>F:{entry.macros.fat}g</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement Home page**

`src/pages/Home.tsx`:
```typescript
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
    <div className="p-4 space-y-4">
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
            <FoodLogEntry key={entry.id} entry={entry} />
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
      </nav>
    </div>
  );
}
```

- [ ] **Step 5: Verify home page renders**

```bash
npx vite
```
Expected: Home page shows input field, repeat button, and bottom nav. (API calls will fail until backend is deployed, but UI renders.)

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.tsx src/components/
git commit -m "feat: implement home page with food input, repeat meal, and food log"
```

---

### Task 4: Today's Nutrition View

**Files:**
- Modify: `src/pages/Nutrition.tsx`
- Create: `src/components/QualitativeProgress.tsx`
- Create: `src/components/NarrativeCard.tsx`
- Create: `src/hooks/useNutrition.ts`

**Interfaces:**
- Consumes: `api.getToday()`, `api.getDailyNarrative()`
- Produces: The qualitative "Today's Nutrition" screen with colored indicators, progress bars, and AI narrative

- [ ] **Step 1: Create QualitativeProgress component**

`src/components/QualitativeProgress.tsx`:
```typescript
interface QualitativeProgressProps {
  label: string;
  statusLabel: string;
  color: 'green' | 'yellow' | 'red';
  current: number;
  target: number;
}

const colorMap = {
  green: { bg: 'bg-emerald-500', text: 'text-emerald-700', icon: '🟢' },
  yellow: { bg: 'bg-amber-400', text: 'text-amber-700', icon: '🟡' },
  red: { bg: 'bg-red-400', text: 'text-red-700', icon: '🔴' },
};

export function QualitativeProgress({ label, statusLabel, color, current, target }: QualitativeProgressProps) {
  const ratio = Math.min(current / target, 1);
  const colors = colorMap[color];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span>{colors.icon}</span>
        <span className="font-medium text-gray-800">{label}</span>
      </div>
      <p className={`text-sm ${colors.text} pl-7`}>{statusLabel}</p>
      <div className="h-2 bg-gray-100 rounded-full ml-7">
        <div
          className={`h-2 rounded-full ${colors.bg} transition-all`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create NarrativeCard component**

`src/components/NarrativeCard.tsx`:
```typescript
interface NarrativeCardProps {
  narrative: string;
  suggestions?: string[];
}

export function NarrativeCard({ narrative, suggestions }: NarrativeCardProps) {
  return (
    <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
      <p className="text-gray-800 text-sm leading-relaxed">{narrative}</p>
      {suggestions && suggestions.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Quick fixes (5 min prep):</p>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-sm text-gray-700">• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create useNutrition hook**

`src/hooks/useNutrition.ts`:
```typescript
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
```

- [ ] **Step 4: Implement Nutrition page**

`src/pages/Nutrition.tsx`:
```typescript
import { QualitativeProgress } from '../components/QualitativeProgress';
import { NarrativeCard } from '../components/NarrativeCard';
import { useNutrition } from '../hooks/useNutrition';

export default function Nutrition() {
  const { nutrition, narrative, isLoading } = useNutrition();

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">Today's Nutrition</h1>

      {nutrition && (
        <div className="space-y-4">
          <QualitativeProgress
            label="Protein"
            statusLabel={nutrition.protein.label}
            color={nutrition.protein.color}
            current={nutrition.protein.current}
            target={nutrition.protein.target}
          />
          <QualitativeProgress
            label="Hydration"
            statusLabel={nutrition.hydration.label}
            color={nutrition.hydration.color}
            current={nutrition.hydration.current}
            target={nutrition.hydration.target}
          />
          <QualitativeProgress
            label="Fiber"
            statusLabel={nutrition.fiber.label}
            color={nutrition.fiber.color}
            current={nutrition.fiber.current}
            target={nutrition.fiber.target}
          />
        </div>
      )}

      {narrative && (
        <NarrativeCard
          narrative={narrative.narrative}
          suggestions={narrative.suggestions}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify nutrition page renders**

```bash
npx vite
```
Expected: Navigate to /nutrition — shows loading state, then placeholder content (will show real data once backend is connected).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Nutrition.tsx src/components/QualitativeProgress.tsx src/components/NarrativeCard.tsx src/hooks/useNutrition.ts
git commit -m "feat: implement Today's Nutrition view with qualitative progress and AI narrative"
```

---

### Task 5: Hydration Page

**Files:**
- Modify: `src/pages/Hydration.tsx`
- Create: `src/components/VesselButton.tsx`
- Create: `src/hooks/useHydration.ts`

**Interfaces:**
- Consumes: `api.logHydration()`, `api.getToday()`
- Produces: Hydration tracking page with tap-to-log vessel buttons and progress visualization

- [ ] **Step 1: Create VesselButton component**

`src/components/VesselButton.tsx`:
```typescript
interface VesselButtonProps {
  name: string;
  oz: number;
  onTap: () => void;
  disabled?: boolean;
}

export function VesselButton({ name, oz, onTap, disabled }: VesselButtonProps) {
  const icon = name === 'bottle' ? '🫗' : '🥛';

  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className="flex flex-col items-center gap-1 border-2 border-blue-200 rounded-xl p-4 hover:bg-blue-50 active:scale-95 transition-transform disabled:opacity-50"
    >
      <span className="text-3xl">{icon}</span>
      <span className="font-medium text-gray-800 capitalize">{name}</span>
      <span className="text-sm text-gray-500">{oz} oz</span>
    </button>
  );
}
```

- [ ] **Step 2: Create useHydration hook**

`src/hooks/useHydration.ts`:
```typescript
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

  return { entries, totalOz, target, isLoading, logDrink };
}
```

- [ ] **Step 3: Implement Hydration page**

`src/pages/Hydration.tsx`:
```typescript
import { VesselButton } from '../components/VesselButton';
import { useHydration } from '../hooks/useHydration';

export default function Hydration() {
  const { entries, totalOz, target, isLoading, logDrink } = useHydration();
  const ratio = Math.min(totalOz / target, 1);

  const vessels = JSON.parse(localStorage.getItem('hydrationVessels') || '[{"name":"glass","oz":12},{"name":"bottle","oz":24}]');

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">Hydration</h1>

      <div className="flex justify-center gap-6">
        {vessels.map((v: { name: string; oz: number }) => (
          <VesselButton
            key={v.name}
            name={v.name}
            oz={v.oz}
            onTap={() => logDrink(v.name, v.oz)}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Today: {totalOz} oz</span>
          <span>{Math.round(ratio * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <span>{entry.vesselType === 'bottle' ? '🫗' : '🥛'}</span>
              <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify hydration page renders**

```bash
npx vite
```
Expected: Navigate to /hydration — shows vessel buttons and progress bar.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Hydration.tsx src/components/VesselButton.tsx src/hooks/useHydration.ts
git commit -m "feat: implement hydration page with tap-to-log vessels and progress bar"
```

---

### Task 6: Symptoms Page

**Files:**
- Modify: `src/pages/Symptoms.tsx`
- Create: `src/components/SymptomSlider.tsx`

**Interfaces:**
- Consumes: `api.logSymptoms()`
- Produces: Daily symptom logging page with severity sliders and injection day toggle

- [ ] **Step 1: Create SymptomSlider component**

`src/components/SymptomSlider.tsx`:
```typescript
interface SymptomSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const severityLabels = ['None', 'Mild', 'Moderate', 'Severe'];

export function SymptomSlider({ label, value, onChange }: SymptomSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{severityLabels[value]}</span>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              value === level
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {severityLabels[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement Symptoms page**

`src/pages/Symptoms.tsx`:
```typescript
import { useState } from 'react';
import { SymptomSlider } from '../components/SymptomSlider';
import { api } from '../api/client';

interface Symptoms {
  nausea: number;
  constipation: number;
  diarrhea: number;
  fatigue: number;
  appetite: number;
}

export default function Symptoms() {
  const [injectionDay, setInjectionDay] = useState(false);
  const [symptoms, setSymptoms] = useState<Symptoms>({
    nausea: 0, constipation: 0, diarrhea: 0, fatigue: 0, appetite: 0,
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
          onClick={() => { setInjectionDay(!injectionDay); setSaved(false); }}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
            injectionDay ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}
        >
          {injectionDay && <span className="text-white text-xs">✓</span>}
        </button>
        <span className="text-gray-700">Injection day</span>
      </div>

      <div className="space-y-5">
        <SymptomSlider label="Nausea" value={symptoms.nausea} onChange={(v) => updateSymptom('nausea', v)} />
        <SymptomSlider label="Constipation" value={symptoms.constipation} onChange={(v) => updateSymptom('constipation', v)} />
        <SymptomSlider label="Diarrhea" value={symptoms.diarrhea} onChange={(v) => updateSymptom('diarrhea', v)} />
        <SymptomSlider label="Fatigue" value={symptoms.fatigue} onChange={(v) => updateSymptom('fatigue', v)} />
        <SymptomSlider label="Appetite" value={symptoms.appetite} onChange={(v) => updateSymptom('appetite', v)} />
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-lg font-medium transition-colors ${
          saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white'
        }`}
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify symptoms page renders**

```bash
npx vite
```
Expected: Navigate to /symptoms — shows injection toggle, symptom sliders, and save button.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Symptoms.tsx src/components/SymptomSlider.tsx
git commit -m "feat: implement symptom tracking page with severity sliders and injection day toggle"
```

---

### Task 7: Weekly Summary Page

**Files:**
- Modify: `src/pages/WeeklySummary.tsx`

**Interfaces:**
- Consumes: `api.getWeeklySummary()`
- Produces: Weekly summary page showing AI-narrated summary

- [ ] **Step 1: Implement WeeklySummary page**

`src/pages/WeeklySummary.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Summary {
  narrativeText: string;
  computedStats: {
    avgProtein: number;
    avgFiber: number;
    hydrationDays: number;
    symptomCorrelations: string[];
  };
}

export default function WeeklySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      const data = await api.getWeeklySummary();
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load weekly summary:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  if (!summary) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Weekly Summary</h1>
        <p className="text-gray-600">No summary available yet. Keep logging and check back on Sunday!</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-800">This Week</h1>

      <div className="bg-emerald-50 rounded-xl p-5">
        <p className="text-gray-800 leading-relaxed">{summary.narrativeText}</p>
      </div>

      {summary.computedStats.symptomCorrelations.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">Patterns noticed:</p>
          <ul className="space-y-1">
            {summary.computedStats.symptomCorrelations.map((c, i) => (
              <li key={i} className="text-sm text-amber-700">• {c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify page renders**

```bash
npx vite
```
Expected: Navigate to /weekly — shows empty state message (no summary yet).

- [ ] **Step 3: Commit**

```bash
git add src/pages/WeeklySummary.tsx
git commit -m "feat: implement weekly summary page with AI narrative and symptom correlations"
```

---

### Task 8: Settings Page

**Files:**
- Modify: `src/pages/Settings.tsx`

**Interfaces:**
- Consumes: `useAuth()` for sign out; localStorage for vessel config
- Produces: Settings page for display name, dietary preference, vessel configuration

- [ ] **Step 1: Implement Settings page**

`src/pages/Settings.tsx`:
```typescript
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
    </div>
  );
}
```

- [ ] **Step 2: Verify settings page**

```bash
npx vite
```
Expected: Navigate to /settings — shows all fields, save button works with localStorage.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: implement settings page (display name, diet, vessels, sign out)"
```

---

### Task 9: PWA Configuration

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Modify: `index.html` (already has manifest link from Sub-Plan 1)

**Interfaces:**
- Consumes: nothing
- Produces: Installable PWA with app icon, offline fallback, and home screen install prompt

- [ ] **Step 1: Create PWA manifest**

`public/manifest.json`:
```json
{
  "name": "GLP-1 Tracker",
  "short_name": "GLP1",
  "description": "Track nutrition on your GLP-1 journey",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create service worker**

`public/sw.js`:
```javascript
const CACHE_NAME = 'glp1-v1';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

- [ ] **Step 3: Register service worker in main.tsx**

Add to end of `src/main.tsx`:
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

- [ ] **Step 4: Create placeholder icons**

```bash
# Create simple placeholder icons (replace with real icons later)
npx create-pwa-icons --input public/icon-512.png || echo "Add 192x192 and 512x512 PNG icons to public/ manually"
```

Note: For MVP, create simple colored squares as placeholder icons. Replace with designed icons later.

- [ ] **Step 5: Verify PWA installs**

```bash
npx vite --host
```
Open on a mobile device or use Chrome DevTools → Application → Manifest to verify the PWA is installable.

- [ ] **Step 6: Commit**

```bash
git add public/manifest.json public/sw.js src/main.tsx
git commit -m "feat: add PWA manifest and service worker for home screen installation"
```

---

## Sub-Plan 3 Complete

After completing these 9 tasks you have:
- Auth flow with Cognito (sign up, sign in, protected routes)
- Full onboarding (welcome → auth → diet preference)
- Home page with natural language food input, repeat meal, and today's log
- Today's Nutrition view with qualitative progress (no raw numbers) and AI narrative
- Hydration tracking with tap-to-log vessels
- Symptom tracking with severity sliders and injection day toggle
- Weekly summary with AI narrative and symptom correlations
- Settings page for preferences
- PWA installable on mobile home screen

**The MVP is complete.** Deploy with `npx ampx pipeline-deploy` or connect your git repo to Amplify Hosting for automatic deploys.
