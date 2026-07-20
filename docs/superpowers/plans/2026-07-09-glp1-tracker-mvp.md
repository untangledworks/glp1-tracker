# GLP-1 Diet Tracker MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA that helps GLP-1 users track nutrition qualitatively, with natural language food logging, hydration tracking, symptom tracking, and AI-narrated weekly summaries.

**Architecture:** React PWA frontend (Vite + Tailwind) communicating via API Gateway to Lambda functions backed by DynamoDB. AI features (food parsing, narrative generation) use AWS Bedrock (Claude). Infrastructure defined with AWS Amplify Gen 2 (TypeScript).

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, AWS Amplify Gen 2, Lambda (Node.js/TS), DynamoDB, Cognito, Bedrock (Claude), EventBridge

## Global Constraints

- Node.js 20.x for all Lambda functions
- TypeScript strict mode everywhere
- Mobile-first responsive design (375px minimum viewport)
- No raw numbers in primary UI views — qualitative progress only — numbers available as drilldown
- All AI prompts must never mention calories or use shaming language
- Dietary preference must be respected in all AI-generated suggestions
- PWA installable on mobile home screen

---

## File Structure

```
glp1tracker/
├── amplify/
│   ├── auth/
│   │   └── resource.ts              # Cognito configuration
│   ├── data/
│   │   └── resource.ts              # DynamoDB table definitions
│   ├── functions/
│   │   ├── parse-food/
│   │   │   ├── handler.ts           # NLP food → macros (Bedrock)
│   │   │   └── handler.test.ts
│   │   ├── log-food/
│   │   │   ├── handler.ts           # Write FoodLog + update RecentFoodIndex
│   │   │   └── handler.test.ts
│   │   ├── log-hydration/
│   │   │   ├── handler.ts           # Write HydrationLog
│   │   │   └── handler.test.ts
│   │   ├── log-symptoms/
│   │   │   ├── handler.ts           # Write/update SymptomLog
│   │   │   └── handler.test.ts
│   │   ├── get-today/
│   │   │   ├── handler.ts           # Aggregate today's nutrition status
│   │   │   └── handler.test.ts
│   │   ├── get-recent-foods/
│   │   │   ├── handler.ts           # Return recent/frequent foods
│   │   │   └── handler.test.ts
│   │   ├── repeat-meal/
│   │   │   ├── handler.ts           # Copy yesterday's meal entries
│   │   │   └── handler.test.ts
│   │   ├── update-food-dictionary/
│   │   │   ├── handler.ts           # Save user correction
│   │   │   └── handler.test.ts
│   │   ├── generate-daily-narrative/
│   │   │   ├── handler.ts           # Stats → Bedrock → narrative
│   │   │   └── handler.test.ts
│   │   └── generate-weekly-summary/
│   │       ├── handler.ts           # Weekly cron → Bedrock → stored summary
│   │       └── handler.test.ts
│   └── backend.ts                   # Amplify backend entry point
├── src/
│   ├── main.tsx                     # App entry point
│   ├── App.tsx                      # Router + auth wrapper
│   ├── api/
│   │   └── client.ts               # API helper (Amplify API calls)
│   ├── auth/
│   │   └── AuthProvider.tsx         # Cognito auth context
│   ├── pages/
│   │   ├── Onboarding.tsx           # Welcome → Sign in → Diet preference
│   │   ├── Home.tsx                 # Main logging screen
│   │   ├── Nutrition.tsx            # Today's qualitative nutrition view
│   │   ├── Hydration.tsx            # Hydration tracking view
│   │   ├── Symptoms.tsx             # Daily symptom logging
│   │   ├── WeeklySummary.tsx        # AI-narrated weekly summary
│   │   └── Settings.tsx             # Vessels, display name, preferences
│   ├── components/
│   │   ├── FoodInput.tsx            # Natural language text input
│   │   ├── RepeatMealButton.tsx     # Time-aware repeat button
│   │   ├── FoodLogEntry.tsx         # Single food log item
│   │   ├── QualitativeProgress.tsx  # Colored progress indicator
│   │   ├── VesselButton.tsx         # Tap-to-log hydration
│   │   ├── SymptomSlider.tsx        # 0-3 severity selector
│   │   └── NarrativeCard.tsx        # AI narrative display
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth state hook
│   │   ├── useNutrition.ts         # Today's nutrition data
│   │   └── useHydration.ts         # Today's hydration data
│   └── types/
│       └── index.ts                 # Shared TypeScript types
├── public/
│   ├── manifest.json               # PWA manifest
│   └── sw.js                       # Service worker
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── index.html
```

---

## Sub-Plans (execute in order)

1. **[Infrastructure & Auth](./2026-07-09-plan-01-infrastructure.md)** — Project scaffolding, Amplify Gen 2 setup, Cognito auth, DynamoDB tables, shared types
2. **[Backend Lambdas](./2026-07-09-plan-02-backend.md)** — All Lambda functions: CRUD (food/hydration/symptoms), food parsing (Bedrock), daily narrative, weekly summary, repeat meal
3. **[Frontend PWA](./2026-07-09-plan-03-frontend.md)** — React app: onboarding, home/logging screen, nutrition view, hydration, symptoms, weekly summary, settings, PWA config

Each sub-plan produces working, independently testable software. Sub-plan 2 depends on sub-plan 1's tables and types. Sub-plan 3 depends on sub-plan 2's API endpoints.
