# Home Screen Enhancements + Sleep Tracking

## Summary

Redesign the Home screen to be a unified daily dashboard: dynamic greeting, injection cycle awareness, supplement tracking, sleep logging, and qualitative progress bars. Add optional sleep tracking with bed/wake times. Extend the `SymptomLogEntry` data model to capture supplements, sleep, and injection site.

## Design Decisions

- **No raw numbers** in progress bars — qualitative labels + color only (reassurance-first)
- **Injection schedule** set once (Onboarding + Settings), badge computes cycle position automatically
- **Sleep tracking** is opt-in (toggle in Settings/Onboarding), appears as morning prompt on Home + always on Symptoms page
- **Supplements** is a single daily toggle, not a per-supplement checklist
- **Data model extends `logSymptoms`** — one daily check-in record captures symptoms, sleep, supplements, and injection site

## Home Screen Layout (top to bottom)

```
Greeting + Injection badge
☐ Took supplements today
[Sleep card — morning only, if enabled & not yet logged today]
Qualitative progress bars (Protein, Fiber, Hydration)
NarrativeCard
FoodInput
Quick-log pills
Today's timeline (food + hydration entries)
```

## Data Model Changes

### Extended `SymptomLogEntry`

```typescript
export interface SymptomLogEntry {
  owner: string;
  date: string;
  injectionDay: boolean;
  injectionSite?: 'stomach' | 'left-thigh' | 'right-thigh' | 'left-arm' | 'right-arm';
  symptoms: Symptoms;
  supplementsTaken?: boolean;
  sleepBedTime?: string;   // "22:30" format
  sleepWakeTime?: string;  // "07:15" format
}
```

### New localStorage keys

- `injectionDayOfWeek` — `"monday"` through `"sunday"`
- `sleepTrackingEnabled` — `"true"` | `"false"`
- `sleepLoggedToday_YYYY-MM-DD` — tracks whether morning card was completed/dismissed
- `supplementsToday_YYYY-MM-DD` — `"true"` if toggled today

## Component Breakdown

### New components

| Component | Purpose |
|---|---|
| `InjectionBadge` | Pill showing "Injection Day" or "Day N post-injection" |
| `SupplementToggle` | Tappable checkbox row, resets daily |
| `SleepCard` | Dismissible morning card with bed/wake time pickers |

### Modified pages

| Page | Changes |
|---|---|
| `Home.tsx` | New layout: greeting logic, badge, supplements, sleep card, progress bars pulled in |
| `Symptoms.tsx` | Add sleep time pickers (when enabled) + injection site selector (when injection day) |
| `Onboarding.tsx` | Add injection day picker step + sleep tracking toggle |
| `Settings.tsx` | Add injection day editor + sleep tracking toggle |

### Unchanged

- `QualitativeProgress` — reused as-is on Home
- `NarrativeCard`, `FoodInput`, `RepeatMealButton` — unchanged
- `Nutrition.tsx`, `Hydration.tsx` — unchanged
- API endpoints — `logSymptoms` accepts new optional fields, no new endpoints

## Feature Details

### 1. Dynamic Greeting

- `hour < 12` → "Good morning, [Name]"
- `hour < 17` → "Good afternoon, [Name]"
- `hour >= 17` → "Good evening, [Name]"
- No name set → "Good morning!" etc.

### 2. Injection Cycle Badge

- User configures injection day of week in Onboarding/Settings
- Badge calculates days since last occurrence of that weekday
- Day 0: "Injection Day 💉"
- Days 1-6: "Day N post-injection"
- If no injection day configured, badge hidden

### 3. Supplements Toggle

- Simple checkbox row on Home
- State persisted in localStorage keyed by date
- Also sent as `supplementsTaken: true` when Symptoms are saved

### 4. Sleep Card (Home — morning prompt)

- Visible only when: sleep tracking enabled AND today's sleep not yet logged
- Two time inputs: bed time (defaults to last entry or 22:30) and wake time (defaults to 07:00)
- "Save" and "Skip" actions
- Save persists to localStorage immediately, included in next Symptoms save
- Dismiss hides card for the day

### 5. Sleep on Symptoms Page

- When sleep tracking enabled: bed/wake time pickers above symptom sliders
- Pre-filled from localStorage if already logged via Home card
- Saved as part of the `logSymptoms` call

### 6. Injection Site (Symptoms Page)

- Visible when "Injection day" is toggled on
- Radio/chip selector: Stomach, Left Thigh, Right Thigh, Left Arm, Right Arm
- Saved as part of `logSymptoms`

### 7. Progress Bars on Home

- Reuse `QualitativeProgress` component
- Show Protein, Fiber, Hydration in a compact card
- Data from `api.getToday()` response (already called by Home)

## Mock Client Updates

- `mockApi.logSymptoms` accepts new optional fields
- `mockApi.getToday` response unchanged (nutrition data already there)
