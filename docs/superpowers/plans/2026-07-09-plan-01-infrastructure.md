# Sub-Plan 1: Infrastructure & Auth

> Part of [GLP-1 Tracker MVP](./2026-07-09-glp1-tracker-mvp.md). Execute tasks in order.

---

### Task 1: Project Scaffolding + Amplify Init

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `amplify/backend.ts`

**Interfaces:**
- Consumes: nothing (greenfield)
- Produces: Working Vite dev server + Amplify backend skeleton that later tasks build on

- [ ] **Step 1: Initialize npm project and install dependencies**

```bash
cd /Users/achakravarthi/glp1tracker
npm init -y
npm install react react-dom react-router-dom
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
```

- [ ] **Step 4: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#10b981" />
    <link rel="manifest" href="/manifest.json" />
    <title>GLP-1 Tracker</title>
  </head>
  <body class="bg-white min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/main.tsx and src/App.tsx**

`src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/App.tsx`:
```typescript
export default function App() {
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold">GLP-1 Tracker</h1>
      <p className="text-gray-600 mt-2">App loading...</p>
    </div>
  );
}
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Verify dev server starts**

```bash
npx vite --open
```
Expected: Browser opens to localhost:5173 showing "GLP-1 Tracker" heading.

- [ ] **Step 8: Install Amplify Gen 2 and initialize backend**

```bash
npm install aws-amplify @aws-amplify/backend @aws-amplify/backend-cli
npx ampx sandbox
```

Create `amplify/backend.ts`:
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

defineBackend({
  auth,
  data,
});
```

- [ ] **Step 9: Commit**

```bash
git init
echo "node_modules/\ndist/\n.amplify/\n.env" > .gitignore
git add .
git commit -m "feat: scaffold project with Vite, React, Tailwind, Amplify Gen 2"
```

---

### Task 2: Cognito Auth Configuration

**Files:**
- Create: `amplify/auth/resource.ts`

**Interfaces:**
- Consumes: Amplify backend skeleton from Task 1
- Produces: `auth` export used in `amplify/backend.ts`; Cognito user pool with email + Google sign-in

- [ ] **Step 1: Create auth resource**

`amplify/auth/resource.ts`:
```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['email', 'profile'],
      },
      callbackUrls: ['http://localhost:5173/', 'https://main.YOUR_APP.amplifyapp.com/'],
      logoutUrls: ['http://localhost:5173/', 'https://main.YOUR_APP.amplifyapp.com/'],
    },
  },
  userAttributes: {
    preferredUsername: { required: false, mutable: true },
  },
});
```

- [ ] **Step 2: Verify Amplify sandbox deploys auth**

```bash
npx ampx sandbox
```
Expected: Terminal shows auth resources being created (Cognito User Pool, Identity Pool). If Google OAuth isn't configured yet, comment out the `google` block and use email-only for now.

- [ ] **Step 3: Commit**

```bash
git add amplify/auth/
git commit -m "feat: configure Cognito auth with email + Google sign-in"
```

---

### Task 3: DynamoDB Table Definitions

**Files:**
- Create: `amplify/data/resource.ts`

**Interfaces:**
- Consumes: Amplify backend from Task 1
- Produces: `data` export used in `amplify/backend.ts`; DynamoDB tables for Users, FoodLogs, FoodDictionary, HydrationLogs, SymptomLogs, RecentFoodIndex, WeeklySummaries

- [ ] **Step 1: Define data schema**

`amplify/data/resource.ts`:
```typescript
import { defineData, a } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    displayName: a.string(),
    dietaryPreference: a.string().required(),
    hydrationVessels: a.json(),
    proteinTarget: a.integer().default(60),
    fiberTarget: a.integer().default(25),
    hydrationTarget: a.integer().default(64),
  }).authorization(allow => [allow.owner()]),

  FoodLog: a.model({
    timestamp: a.datetime().required(),
    rawInput: a.string().required(),
    resolvedName: a.string(),
    macros: a.json().required(),
    mealSlot: a.enum(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']),
    dictionaryRef: a.string(),
  }).authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('timestamp'),
    ]),

  FoodDictionary: a.model({
    foodAlias: a.string().required(),
    components: a.json(),
    macros: a.json().required(),
    source: a.enum(['AI_ESTIMATED', 'USER_CORRECTED']),
    updatedAt: a.datetime(),
  }).authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('foodAlias'),
    ]),

  HydrationLog: a.model({
    timestamp: a.datetime().required(),
    vesselType: a.string().required(),
    oz: a.integer().required(),
  }).authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('timestamp'),
    ]),

  SymptomLog: a.model({
    date: a.date().required(),
    injectionDay: a.boolean().default(false),
    symptoms: a.json().required(),
  }).authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('date'),
    ]),

  RecentFoodIndex: a.model({
    foodAlias: a.string().required(),
    lastUsed: a.datetime().required(),
    useCount: a.integer().default(1),
  }).authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('useCount'),
    ]),

  WeeklySummary: a.model({
    weekStart: a.date().required(),
    narrativeText: a.string().required(),
    computedStats: a.json().required(),
  }).authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('weekStart'),
    ]),
});

export type Schema = typeof schema;
export const data = defineData({ schema });
```

- [ ] **Step 2: Verify sandbox deploys tables**

```bash
npx ampx sandbox
```
Expected: Terminal shows DynamoDB tables being created. Check the Amplify console or AWS console to verify tables exist.

- [ ] **Step 3: Commit**

```bash
git add amplify/data/
git commit -m "feat: define DynamoDB tables for all entities (food, hydration, symptoms, summaries)"
```

---

### Task 4: Shared TypeScript Types

**Files:**
- Create: `src/types/index.ts`

**Interfaces:**
- Consumes: Data schema from Task 3 (mirrors the shapes)
- Produces: `Macros`, `FoodLogEntry`, `FoodDictionaryEntry`, `HydrationLogEntry`, `SymptomLogEntry`, `WeeklySummaryEntry`, `UserProfile`, `NutritionStatus`, `MealSlot` — used by all frontend and backend code

- [ ] **Step 1: Create shared types**

`src/types/index.ts`:
```typescript
export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';

export type SymptomSeverity = 0 | 1 | 2 | 3;

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calories: number;
}

export interface FoodLogEntry {
  id: string;
  timestamp: string;
  rawInput: string;
  resolvedName: string | null;
  macros: Macros;
  mealSlot: MealSlot;
  dictionaryRef: string | null;
}

export interface FoodDictionaryEntry {
  id: string;
  foodAlias: string;
  components: { item: string; qty: string }[] | null;
  macros: Macros;
  source: 'AI_ESTIMATED' | 'USER_CORRECTED';
  updatedAt: string;
}

export interface HydrationLogEntry {
  id: string;
  timestamp: string;
  vesselType: string;
  oz: number;
}

export interface Symptoms {
  nausea: SymptomSeverity;
  constipation: SymptomSeverity;
  diarrhea: SymptomSeverity;
  fatigue: SymptomSeverity;
  appetite: SymptomSeverity;
}

export interface SymptomLogEntry {
  id: string;
  date: string;
  injectionDay: boolean;
  symptoms: Symptoms;
}

export interface HydrationVessel {
  name: string;
  oz: number;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  dietaryPreference: string;
  hydrationVessels: HydrationVessel[];
  proteinTarget: number;
  fiberTarget: number;
  hydrationTarget: number;
}

export interface NutritionStatus {
  protein: { current: number; target: number; label: string; color: 'green' | 'yellow' | 'red' };
  fiber: { current: number; target: number; label: string; color: 'green' | 'yellow' | 'red' };
  hydration: { current: number; target: number; label: string; color: 'green' | 'yellow' | 'red' };
}

export interface WeeklySummaryEntry {
  id: string;
  weekStart: string;
  narrativeText: string;
  computedStats: {
    avgProtein: number;
    avgFiber: number;
    hydrationDays: number;
    symptomCorrelations: string[];
  };
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/
git commit -m "feat: add shared TypeScript types for all domain entities"
```

---

## Sub-Plan 1 Complete

After completing these 4 tasks you have:
- A working Vite + React + Tailwind dev server
- Amplify Gen 2 backend with Cognito auth (email + Google)
- All DynamoDB tables defined and deployed
- Shared TypeScript types ready for backend and frontend use

**Next:** Proceed to [Sub-Plan 2: Backend Lambdas](./2026-07-09-plan-02-backend.md)
