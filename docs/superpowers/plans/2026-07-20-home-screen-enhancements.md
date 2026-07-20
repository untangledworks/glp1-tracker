# Home Screen Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Home screen into a unified daily dashboard with dynamic greeting, injection cycle badge, supplement toggle, sleep tracking, and qualitative progress bars — extending the data model to support new fields.

**Architecture:** All new features compose as small, focused components rendered on Home.tsx. State for preferences lives in localStorage (injection day of week, sleep tracking toggle). Daily state (supplements taken, sleep logged) also uses localStorage keyed by date. The SymptomLogEntry type is extended to include injection site, supplements, and sleep data — this flows through the existing `logSymptoms` API call.

**Tech Stack:** React 19, TypeScript 7, Tailwind CSS 4, Vitest, React Testing Library, Vite 8

## Global Constraints

- No raw numbers shown in progress indicators — qualitative labels + color bars only
- All new localStorage keys: `injectionDayOfWeek`, `sleepTrackingEnabled`, `supplementsToday_YYYY-MM-DD`, `sleepBedTime_YYYY-MM-DD`, `sleepWakeTime_YYYY-MM-DD`, `sleepLoggedToday_YYYY-MM-DD`
- Follow existing Tailwind utility patterns: `bg-ivory`, `bg-linen`, `bg-sage`, `text-forest`, `rounded-2xl`, `shadow-sm`
- Components use the existing pattern: named export, props interface, Tailwind classes inline
- Tests use Vitest + React Testing Library with jsdom environment

---

### Task 1: Utility Functions — Greeting + Injection Cycle

**Files:**
- Create: `src/utils/greeting.ts`
- Create: `src/utils/greeting.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `getGreeting(displayName: string | null): string`
  - `getInjectionCycleDay(injectionDayOfWeek: string | null, today?: Date): { dayNumber: number; isInjectionDay: boolean } | null`

- [ ] **Step 1: Write failing tests**

```typescript
// src/utils/greeting.test.ts
import { describe, it, expect } from 'vitest';
import { getGreeting, getInjectionCycleDay } from './greeting';

describe('getGreeting', () => {
  it('returns morning greeting with name before noon', () => {
    const result = getGreeting('Marlena', new Date('2026-07-20T09:00:00'));
    expect(result).toBe('Good morning, Marlena');
  });

  it('returns afternoon greeting with name between noon and 5pm', () => {
    const result = getGreeting('Marlena', new Date('2026-07-20T14:00:00'));
    expect(result).toBe('Good afternoon, Marlena');
  });

  it('returns evening greeting with name after 5pm', () => {
    const result = getGreeting('Marlena', new Date('2026-07-20T19:00:00'));
    expect(result).toBe('Good evening, Marlena');
  });

  it('returns greeting without name when null', () => {
    const result = getGreeting(null, new Date('2026-07-20T09:00:00'));
    expect(result).toBe('Good morning!');
  });
});

describe('getInjectionCycleDay', () => {
  it('returns null when no injection day configured', () => {
    expect(getInjectionCycleDay(null)).toBeNull();
  });

  it('returns day 0 on injection day', () => {
    // 2026-07-20 is a Monday
    const result = getInjectionCycleDay('monday', new Date('2026-07-20T10:00:00'));
    expect(result).toEqual({ dayNumber: 0, isInjectionDay: true });
  });

  it('returns day 3 three days after injection', () => {
    // 2026-07-20 is Monday, Thursday = 3 days later
    const result = getInjectionCycleDay('monday', new Date('2026-07-23T10:00:00'));
    expect(result).toEqual({ dayNumber: 3, isInjectionDay: false });
  });

  it('returns day 6 one day before next injection', () => {
    // 2026-07-20 is Monday, Sunday = 6 days later
    const result = getInjectionCycleDay('monday', new Date('2026-07-26T10:00:00'));
    expect(result).toEqual({ dayNumber: 6, isInjectionDay: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/greeting.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement utility functions**

```typescript
// src/utils/greeting.ts
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getGreeting(displayName: string | null, now: Date = new Date()): string {
  const hour = now.getHours();
  let timeOfDay: string;
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else timeOfDay = 'evening';

  return displayName
    ? `Good ${timeOfDay}, ${displayName}`
    : `Good ${timeOfDay}!`;
}

export function getInjectionCycleDay(
  injectionDayOfWeek: string | null,
  today: Date = new Date()
): { dayNumber: number; isInjectionDay: boolean } | null {
  if (!injectionDayOfWeek) return null;

  const targetDayIndex = DAYS.indexOf(injectionDayOfWeek.toLowerCase());
  if (targetDayIndex === -1) return null;

  const todayIndex = today.getDay();
  const daysSince = (todayIndex - targetDayIndex + 7) % 7;

  return {
    dayNumber: daysSince,
    isInjectionDay: daysSince === 0,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/greeting.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/greeting.ts src/utils/greeting.test.ts
git commit -m "feat: add greeting and injection cycle utility functions"
```

---

### Task 2: Extend Data Model — SymptomLogEntry + Types

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/api/mock-client.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - Extended `SymptomLogEntry` with `injectionSite?`, `supplementsTaken?`, `sleepBedTime?`, `sleepWakeTime?`
  - Type `InjectionSite = 'stomach' | 'left-thigh' | 'right-thigh' | 'left-arm' | 'right-arm'`

- [ ] **Step 1: Update types**

In `src/types/index.ts`, add the `InjectionSite` type and extend `SymptomLogEntry`:

```typescript
// Add after SymptomSeverity type
export type InjectionSite = 'stomach' | 'left-thigh' | 'right-thigh' | 'left-arm' | 'right-arm';
```

Update `SymptomLogEntry`:

```typescript
export interface SymptomLogEntry {
  owner: string;
  date: string;
  injectionDay: boolean;
  injectionSite?: InjectionSite;
  symptoms: Symptoms;
  supplementsTaken?: boolean;
  sleepBedTime?: string;
  sleepWakeTime?: string;
}
```

- [ ] **Step 2: Update mock client to accept new fields**

In `src/api/mock-client.ts`, update the `logSymptoms` method signature to accept the new optional fields:

```typescript
async logSymptoms(data: {
  date: string;
  injectionDay: boolean;
  injectionSite?: string;
  symptoms: Record<string, number>;
  supplementsTaken?: boolean;
  sleepBedTime?: string;
  sleepWakeTime?: string;
}): Promise<{ entry: SymptomLogEntry }> {
  await delay(200);
  const entry: SymptomLogEntry = {
    owner: MOCK_USER,
    date: data.date,
    injectionDay: data.injectionDay,
    injectionSite: data.injectionSite as any,
    symptoms: data.symptoms as any,
    supplementsTaken: data.supplementsTaken,
    sleepBedTime: data.sleepBedTime,
    sleepWakeTime: data.sleepWakeTime,
  };
  return { entry };
},
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/api/mock-client.ts
git commit -m "feat: extend SymptomLogEntry with injection site, supplements, sleep fields"
```

---

### Task 3: InjectionBadge Component

**Files:**
- Create: `src/components/InjectionBadge.tsx`
- Create: `src/components/InjectionBadge.test.tsx`

**Interfaces:**
- Consumes: `getInjectionCycleDay` from `src/utils/greeting.ts`
- Produces: `InjectionBadge` component (reads `injectionDayOfWeek` from localStorage)

- [ ] **Step 1: Write failing test**

```typescript
// src/components/InjectionBadge.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InjectionBadge } from './InjectionBadge';

describe('InjectionBadge', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when no injection day configured', () => {
    const { container } = render(<InjectionBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows injection day badge on injection day', () => {
    localStorage.setItem('injectionDayOfWeek', 'monday');
    // Mock today as Monday
    render(<InjectionBadge today={new Date('2026-07-20T10:00:00')} />);
    expect(screen.getByText(/Injection Day/)).toBeInTheDocument();
  });

  it('shows days post-injection', () => {
    localStorage.setItem('injectionDayOfWeek', 'monday');
    // Mock today as Wednesday (day 2)
    render(<InjectionBadge today={new Date('2026-07-22T10:00:00')} />);
    expect(screen.getByText(/Day 2 post-injection/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/InjectionBadge.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement component**

```typescript
// src/components/InjectionBadge.tsx
import { getInjectionCycleDay } from '../utils/greeting';

interface InjectionBadgeProps {
  today?: Date;
}

export function InjectionBadge({ today }: InjectionBadgeProps) {
  const injectionDayOfWeek = localStorage.getItem('injectionDayOfWeek');
  const cycle = getInjectionCycleDay(injectionDayOfWeek, today);

  if (!cycle) return null;

  const label = cycle.isInjectionDay
    ? 'Injection Day 💉'
    : `Day ${cycle.dayNumber} post-injection`;

  return (
    <span className={`inline-block text-sm px-3 py-1 rounded-full ${
      cycle.isInjectionDay
        ? 'bg-sage-light text-sage-dark font-medium'
        : 'bg-linen text-forest/60'
    }`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/InjectionBadge.test.tsx`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/InjectionBadge.tsx src/components/InjectionBadge.test.tsx
git commit -m "feat: add InjectionBadge component"
```

---

### Task 4: SupplementToggle Component

**Files:**
- Create: `src/components/SupplementToggle.tsx`
- Create: `src/components/SupplementToggle.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `SupplementToggle` component with `onToggle?: (taken: boolean) => void` prop

- [ ] **Step 1: Write failing test**

```typescript
// src/components/SupplementToggle.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SupplementToggle } from './SupplementToggle';

describe('SupplementToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders unchecked by default', () => {
    render(<SupplementToggle />);
    expect(screen.getByText('Took supplements today')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toHaveClass('bg-sage-light');
  });

  it('toggles on click and persists to localStorage', () => {
    render(<SupplementToggle />);
    fireEvent.click(screen.getByRole('button'));
    const today = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(`supplementsToday_${today}`)).toBe('true');
  });

  it('reads persisted state on mount', () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`supplementsToday_${today}`, 'true');
    render(<SupplementToggle />);
    expect(screen.getByRole('button')).toHaveClass('bg-sage-light');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/SupplementToggle.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement component**

```typescript
// src/components/SupplementToggle.tsx
import { useState } from 'react';

interface SupplementToggleProps {
  onToggle?: (taken: boolean) => void;
}

export function SupplementToggle({ onToggle }: SupplementToggleProps) {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `supplementsToday_${today}`;
  const [taken, setTaken] = useState(() => localStorage.getItem(storageKey) === 'true');

  function handleToggle() {
    const newValue = !taken;
    setTaken(newValue);
    if (newValue) {
      localStorage.setItem(storageKey, 'true');
    } else {
      localStorage.removeItem(storageKey);
    }
    onToggle?.(newValue);
  }

  return (
    <button
      onClick={handleToggle}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${
        taken ? 'bg-sage-light border border-sage/30' : 'bg-white border border-forest/10'
      }`}
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        taken ? 'bg-sage border-sage' : 'border-forest/20'
      }`}>
        {taken && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
      <span className="text-forest/80">Took supplements today</span>
    </button>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SupplementToggle.test.tsx`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SupplementToggle.tsx src/components/SupplementToggle.test.tsx
git commit -m "feat: add SupplementToggle component"
```

---

### Task 5: SleepCard Component

**Files:**
- Create: `src/components/SleepCard.tsx`
- Create: `src/components/SleepCard.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `SleepCard` component with `onSave?: (bedTime: string, wakeTime: string) => void` and `onDismiss?: () => void` props

- [ ] **Step 1: Write failing test**

```typescript
// src/components/SleepCard.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SleepCard } from './SleepCard';

describe('SleepCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when sleep tracking disabled', () => {
    const { container } = render(<SleepCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when already logged today', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`sleepLoggedToday_${today}`, 'true');
    const { container } = render(<SleepCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders card when sleep tracking enabled and not logged', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    render(<SleepCard />);
    expect(screen.getByText("How'd you sleep?")).toBeInTheDocument();
  });

  it('dismisses card and marks as logged', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    const onDismiss = vi.fn();
    render(<SleepCard onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Skip'));
    const today = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(`sleepLoggedToday_${today}`)).toBe('true');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('saves sleep times to localStorage and calls onSave', () => {
    localStorage.setItem('sleepTrackingEnabled', 'true');
    const onSave = vi.fn();
    render(<SleepCard onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    const today = new Date().toISOString().split('T')[0];
    expect(localStorage.getItem(`sleepLoggedToday_${today}`)).toBe('true');
    expect(localStorage.getItem(`sleepBedTime_${today}`)).toBeTruthy();
    expect(localStorage.getItem(`sleepWakeTime_${today}`)).toBeTruthy();
    expect(onSave).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/SleepCard.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement component**

```typescript
// src/components/SleepCard.tsx
import { useState } from 'react';

interface SleepCardProps {
  onSave?: (bedTime: string, wakeTime: string) => void;
  onDismiss?: () => void;
}

export function SleepCard({ onSave, onDismiss }: SleepCardProps) {
  const sleepEnabled = localStorage.getItem('sleepTrackingEnabled') === 'true';
  const today = new Date().toISOString().split('T')[0];
  const alreadyLogged = localStorage.getItem(`sleepLoggedToday_${today}`) === 'true';

  const lastBedTime = localStorage.getItem(`sleepBedTime_${today}`) || '22:30';
  const lastWakeTime = localStorage.getItem(`sleepWakeTime_${today}`) || '07:00';

  const [bedTime, setBedTime] = useState(lastBedTime);
  const [wakeTime, setWakeTime] = useState(lastWakeTime);
  const [dismissed, setDismissed] = useState(false);

  if (!sleepEnabled || alreadyLogged || dismissed) return null;

  function handleSave() {
    localStorage.setItem(`sleepBedTime_${today}`, bedTime);
    localStorage.setItem(`sleepWakeTime_${today}`, wakeTime);
    localStorage.setItem(`sleepLoggedToday_${today}`, 'true');
    setDismissed(true);
    onSave?.(bedTime, wakeTime);
  }

  function handleDismiss() {
    localStorage.setItem(`sleepLoggedToday_${today}`, 'true');
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-forest/5">
      <h3 className="font-medium text-forest">How'd you sleep?</h3>
      <div className="flex gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-forest/50">Bed time</label>
          <input
            type="time"
            value={bedTime}
            onChange={(e) => setBedTime(e.target.value)}
            className="w-full bg-ivory border border-forest/10 rounded-xl px-3 py-2.5 text-forest focus:outline-none focus:ring-2 focus:ring-sage/30"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-forest/50">Wake time</label>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="w-full bg-ivory border border-forest/10 rounded-xl px-3 py-2.5 text-forest focus:outline-none focus:ring-2 focus:ring-sage/30"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-dark transition-colors"
        >
          Save
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 py-2.5 rounded-xl bg-linen text-forest/60 text-sm font-medium hover:bg-forest/5 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SleepCard.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SleepCard.tsx src/components/SleepCard.test.tsx
git commit -m "feat: add SleepCard component for morning sleep logging"
```

---

### Task 6: Redesign Home Page

**Files:**
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- Consumes: `getGreeting` from `src/utils/greeting.ts`, `InjectionBadge`, `SupplementToggle`, `SleepCard`, `QualitativeProgress` from existing components, `api.getToday()` for nutrition data
- Produces: redesigned Home page

- [ ] **Step 1: Rewrite Home.tsx with new layout**

```typescript
// src/pages/Home.tsx
import { useEffect, useState } from 'react';
import { FoodInput } from '../components/FoodInput';
import { RepeatMealButton } from '../components/RepeatMealButton';
import { FoodLogEntry } from '../components/FoodLogEntry';
import { NarrativeCard } from '../components/NarrativeCard';
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
  const [narrative, setNarrative] = useState<{ narrative: string; suggestions: string[] } | null>(null);
  const [nutrition, setNutrition] = useState<NutritionStatus | null>(null);

  useEffect(() => {
    loadToday();
    loadRecent();
    loadNarrative();
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

  async function loadNarrative() {
    try {
      const data = await api.getDailyNarrative();
      setNarrative(data);
    } catch (err) {
      console.error('Failed to load narrative:', err);
    }
  }

  function handleFoodLogged(entry: FoodLogEntryType) {
    setEntries(prev => [...prev, entry]);
    loadNarrative();
    loadToday();
  }

  function handleMealRepeated(newEntries: FoodLogEntryType[]) {
    setEntries(prev => [...prev, ...newEntries]);
    loadNarrative();
    loadToday();
  }

  async function quickLog(food: string) {
    try {
      const { macros, resolvedName } = await api.parseFood(food);
      const { entry } = await api.logFood({ rawInput: food, resolvedName, macros });
      setEntries(prev => [...prev, entry]);
      loadNarrative();
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

      {narrative && (
        <NarrativeCard narrative={narrative.narrative} suggestions={narrative.suggestions} />
      )}

      <FoodInput onFoodLogged={handleFoodLogged} />

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
              <FoodLogEntry key={entry.timestamp} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run dev server and visually verify**

Run: `npx vite --open`
Expected: Home page shows greeting, injection badge (if configured), supplement toggle, sleep card (if enabled), progress bars, narrative, food input, and timeline

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: redesign home screen with dashboard layout"
```

---

### Task 7: Update Symptoms Page — Sleep + Injection Site

**Files:**
- Modify: `src/pages/Symptoms.tsx`

**Interfaces:**
- Consumes: `api.logSymptoms` (extended), `InjectionSite` type
- Produces: Updated Symptoms page with sleep pickers and injection site selector

- [ ] **Step 1: Rewrite Symptoms.tsx**

```typescript
// src/pages/Symptoms.tsx
import { useState } from 'react';
import { SymptomSlider } from '../components/SymptomSlider';
import { api } from '../api/client';
import type { Symptoms, InjectionSite } from '../types';

const INJECTION_SITES: { value: InjectionSite; label: string }[] = [
  { value: 'stomach', label: 'Stomach' },
  { value: 'left-thigh', label: 'Left Thigh' },
  { value: 'right-thigh', label: 'Right Thigh' },
  { value: 'left-arm', label: 'Left Arm' },
  { value: 'right-arm', label: 'Right Arm' },
];

export default function Symptoms() {
  const [injectionDay, setInjectionDay] = useState(false);
  const [injectionSite, setInjectionSite] = useState<InjectionSite | undefined>();
  const [symptoms, setSymptoms] = useState<Symptoms>({
    nausea: 0,
    constipation: 0,
    diarrhea: 0,
    fatigue: 0,
    appetite: 0,
  });
  const [saved, setSaved] = useState(false);

  const sleepEnabled = localStorage.getItem('sleepTrackingEnabled') === 'true';
  const today = new Date().toISOString().split('T')[0];
  const [bedTime, setBedTime] = useState(
    () => localStorage.getItem(`sleepBedTime_${today}`) || '22:30'
  );
  const [wakeTime, setWakeTime] = useState(
    () => localStorage.getItem(`sleepWakeTime_${today}`) || '07:00'
  );

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
        injectionSite: injectionDay ? injectionSite : undefined,
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

      {injectionDay && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-medium text-forest/60">Injection site</h3>
          <div className="flex flex-wrap gap-2">
            {INJECTION_SITES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setInjectionSite(value); setSaved(false); }}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                  injectionSite === value
                    ? 'bg-sage text-white'
                    : 'bg-linen text-forest/70 hover:bg-sage-light'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Symptoms.tsx
git commit -m "feat: add sleep time pickers and injection site selector to symptoms page"
```

---

### Task 8: Update Onboarding — Injection Day + Sleep Toggle

**Files:**
- Modify: `src/pages/Onboarding.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: Two new onboarding steps after diet selection — injection day picker and sleep tracking toggle

- [ ] **Step 1: Update Onboarding.tsx with new steps**

```typescript
// src/pages/Onboarding.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

type Step = 'welcome' | 'signin' | 'diet' | 'injection' | 'sleep';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

  function handleDietSelect(preference: string) {
    localStorage.setItem('dietaryPreference', preference);
    setStep('injection');
  }

  function handleInjectionDay(day: string | null) {
    if (day) {
      localStorage.setItem('injectionDayOfWeek', day.toLowerCase());
    }
    setStep('sleep');
  }

  function handleSleepChoice(enabled: boolean) {
    localStorage.setItem('sleepTrackingEnabled', enabled ? 'true' : 'false');
    navigate('/');
  }

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-sage-light max-w-md mx-auto">
        <div className="space-y-6">
          <h1 className="font-display text-3xl font-semibold text-forest">
            You're on a GLP-1.
          </h1>
          <p className="text-lg text-forest/70">Your appetite has changed.</p>
          <p className="text-forest/60 leading-relaxed">
            This app helps you make sure you're getting enough of what matters:
          </p>
          <ul className="text-left text-forest/70 space-y-3 mx-auto max-w-xs">
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
              <span><span className="font-medium text-forest">Protein</span> — protect muscle</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
              <span><span className="font-medium text-forest">Fiber</span> — support digestion</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
              <span><span className="font-medium text-forest">Hydration</span> — energy & skin</span>
            </li>
          </ul>
          <p className="text-sm text-forest/40">No calorie limits. No judgment.</p>
        </div>
        <button
          onClick={() => setStep('signin')}
          className="mt-10 w-full bg-sage text-white py-4 px-6 rounded-2xl text-lg font-medium hover:bg-sage-dark transition-colors"
        >
          Let's go
        </button>
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-8">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-4 py-3.5 text-lg placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-4 py-3.5 text-lg placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-sage text-white py-3.5 rounded-2xl text-lg font-medium hover:bg-sage-dark transition-colors"
          >
            {isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-sage text-sm hover:text-sage-dark transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    );
  }

  if (step === 'diet') {
    const options = ['Vegetarian', 'Vegan', 'Pescatarian', 'No restrictions'];
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">Any dietary preferences?</h2>
        <p className="text-forest/60 mb-8">This helps us make better suggestions for you.</p>
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleDietSelect(option.toLowerCase())}
              className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'injection') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">When do you inject?</h2>
        <p className="text-forest/60 mb-8">We'll track where you are in your weekly cycle.</p>
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => handleInjectionDay(day)}
              className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
            >
              {day}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleInjectionDay(null)}
          className="mt-4 text-forest/40 text-sm hover:text-forest/60 transition-colors"
        >
          Skip — I'll set this later
        </button>
      </div>
    );
  }

  if (step === 'sleep') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">Track sleep?</h2>
        <p className="text-forest/60 mb-8">
          Logging bed and wake times helps us spot how sleep affects your side effects — especially fatigue.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => handleSleepChoice(true)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
          >
            Yes, track my sleep
          </button>
          <button
            onClick={() => handleSleepChoice(false)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Onboarding.tsx
git commit -m "feat: add injection day and sleep tracking steps to onboarding"
```

---

### Task 9: Update Settings — Injection Day + Sleep Toggle

**Files:**
- Modify: `src/pages/Settings.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: Settings page with injection day picker and sleep tracking toggle

- [ ] **Step 1: Update Settings.tsx with new fields**

Add the following state declarations after the existing state in Settings.tsx:

```typescript
const [injectionDay, setInjectionDay] = useState(localStorage.getItem('injectionDayOfWeek') || '');
const [sleepTracking, setSleepTracking] = useState(localStorage.getItem('sleepTrackingEnabled') === 'true');
```

Add these to the `handleSave` function, before `setSaved(true)`:

```typescript
if (injectionDay) {
  localStorage.setItem('injectionDayOfWeek', injectionDay);
} else {
  localStorage.removeItem('injectionDayOfWeek');
}
localStorage.setItem('sleepTrackingEnabled', sleepTracking ? 'true' : 'false');
```

Add these sections in the settings card (inside the `bg-white rounded-2xl` div), after the water vessels section:

```tsx
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
```

- [ ] **Step 2: Full updated Settings.tsx file**

```typescript
// src/pages/Settings.tsx
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add injection day and sleep tracking to settings"
```

---

### Task 10: Update API Client Types

**Files:**
- Modify: `src/api/client.ts`

**Interfaces:**
- Consumes: `InjectionSite` type
- Produces: `logSymptoms` method accepts new optional fields

- [ ] **Step 1: Update the `logSymptoms` type in client.ts**

Update the `logSymptoms` method in the `realApi` object:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: update logSymptoms API to accept new optional fields"
```
