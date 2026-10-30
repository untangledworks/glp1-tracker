# GLP-1 Tracker

A diet tracker for people on GLP-1 medications (Ozempic, Mounjaro, Wegovy, Zepbound, etc.). Most food loggers try to get you to eat less. This one answers a different question: **"Am I eating enough to stay healthy on this medication?"**

The main views describe progress in words ("Almost there", "A little low today") and leave the exact numbers for when you drill in. The backend does the deterministic stats, and an AI layer turns them into friendly, actionable observations.

## Features

- **Natural-language food logging**: type what you ate ("~1/2 cup plain nonfat greek yogurt") and AI resolves it to macros
- **Personal food dictionary and quick repeat**: corrections are remembered, and recent meals can be re-logged in one tap
- **Hydration tracking** with configurable vessels (glass, bottle, etc.)
- **Symptom logging** tied to your injection day, plus sleep and fatigue tracking
- **Daily narrative and weekly summary**: AI-written insights based on computed trends
- **Installable PWA** with a web manifest and service worker

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS v4 |
| Hosting / IaC | AWS Amplify Gen 2 (CDK-based backend definitions in `amplify/`) |
| Auth | Amazon Cognito (email sign-in; Google OAuth stubbed in `amplify/auth/resource.ts`) |
| API | Amazon API Gateway REST API with a Cognito authorizer |
| Compute | AWS Lambda (one TypeScript function per endpoint in `amplify/functions/`) |
| Data | Amazon DynamoDB (tables defined via the Amplify Data schema) |
| AI | Amazon Bedrock running Claude Haiku for food parsing and narrative generation |
| Testing | Vitest, React Testing Library, jsdom |

## Project Structure

```
amplify/
  auth/           Cognito config
  data/           DynamoDB schema (User, FoodLog, HydrationLog, SymptomLog, ...)
  functions/      Lambda handlers (+ tests), one folder per endpoint
  backend.ts      Wires functions, IAM policies, and API Gateway routes
src/
  api/            API client (+ mock client for offline dev)
  auth/           Auth provider
  components/     UI components
  hooks/          Data hooks (nutrition, hydration, auth)
  pages/          Home, Nutrition, Hydration, Symptoms, WeeklySummary, Settings, Onboarding
public/           PWA manifest, service worker, icons
docs/             Design specs and implementation plans
```

## Getting Started

```bash
npm install

# Run the frontend against mock data (no AWS needed)
VITE_MOCK_MODE=true npm run dev

# Or deploy a personal Amplify sandbox backend, then run against it
npx ampx sandbox
npm run dev
```

The sandbox writes `amplify_outputs.json`, which the frontend reads to find the Cognito and API Gateway config. Bedrock model access for Claude must be enabled in your AWS account.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run the Vitest test suite |
