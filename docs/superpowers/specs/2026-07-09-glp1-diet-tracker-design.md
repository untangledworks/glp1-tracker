# GLP-1 Diet Tracker — Design Spec

## Product Vision

A diet tracker built specifically for people on GLP-1 medications. The emotional job: **"Am I eating enough to stay healthy on this medication?"** Everything in the app revolves around answering that question.

Users don't want a food logger. They want reassurance.

**Positioning:** This is an app that ensures you eat enough to maintain energy, protect muscle, prevent hair loss, and support digestion — not one that stops you from eating too much.

## Target User

Someone on a GLP-1 medication (Ozempic, Mounjaro, Wegovy, Zepbound, etc.) whose appetite has changed and who wants confidence they're getting adequate nutrition without obsessing over numbers.

## Core Principle: No Numbers in the Primary View

The main experience is qualitative, not quantitative:
- "Almost there — 12g more gets you into today's target" (not "Protein: 41g / 60g")
- "A little low today" (not "Fiber: 8g / 25g")
- "Excellent" (not "Hydration: 64oz / 64oz")

Numbers are available if you drill in. They are never the primary interface.

## Core Principle: Backend Computes, AI Narrates

Two distinct layers:
- **Stats engine (deterministic):** Calculates averages, identifies patterns (lowest-protein meal, post-injection drops, trends)
- **AI narrative layer:** Takes computed stats and writes human, actionable observations

Example:
- Backend calculation: Lowest-protein meal = dinner (avg 12g vs 25g at lunch)
- AI narrative: "You're doing a great job getting protein early in the day. Dinner tends to be lighter — consider adding a serving of paneer, tofu, or edamame a few evenings this week."

## Core Features (MVP)

### 1. Natural Language Food Logging

Users type what they ate in their own words. The app resolves it to macros via AI (Bedrock/Claude).

- Input: "~1/2 a cup plain non fat greek yoghurt"
- Output: logged with macros resolved (shown qualitatively in the daily view)
- Timestamp recorded automatically
- Subtle "Edit" option on every entry for corrections

### 2. Personal Food Dictionary (Separate from Food Log)

Architecture: FoodDictionary stores definitions. FoodLog stores events.

**FoodDictionary** — custom meanings:
- Stores: components, macros, source, updatedAt
- Example: "fried egg" → 1 egg + 1/2 tsp olive oil + 2 tbsp egg whites

**FoodLog** — actual events:
- Stores: what was eaten, mealSlot, macros, timestamp

**Flow:** User types "fried egg" → Check FoodDictionary → Find custom definition → Write FoodLog → Update RecentFoodIndex

**Learning mechanism:** Low friction. First use logs with generic AI estimate. User corrects if they want → correction saved to dictionary for next time.

### 3. Today's Nutrition View (Primary Screen After Logging)

No raw numbers. Qualitative progress with AI-generated context:

```
┌─────────────────────────────────┐
│  Today's Nutrition              │
│                                 │
│  🟢 Protein                     │
│  Almost there.                  │
│  12g more gets you to target.   │
│                                 │
│  🟢 Hydration                   │
│  Excellent.                     │
│                                 │
│  🟡 Fiber                       │
│  A little low today.            │
│                                 │
│  ─── Progress ────────────────  │
│  Protein   ████████░░           │
│  Hydration ██████████           │
│  Fiber     ███░░░░░░░           │
└─────────────────────────────────┘
```

**Evening experience (8 PM, user is short on protein):**

```
┌─────────────────────────────────┐
│  You're about 20g short of your │
│  usual protein intake today.    │
│                                 │
│  Quick fixes (5 min prep):      │
│  • Cottage cheese               │
│  • Protein shake                │
│  • Greek yogurt                 │
│  • Paneer                       │
└─────────────────────────────────┘
```

### 4. Repeat Meals

Time-aware primary button + expandable options:
- Shows contextual "Repeat Yesterday's [Meal]" based on time of day
  - Morning → Breakfast, Midday → Lunch, Evening → Dinner
- "Repeat a different meal" expands to show all options
- One tap logs all items from that meal slot with current timestamps

### 5. Hydration Tracking

- User configures vessels (glass/bottle with custom oz) — settable anytime, not gated behind onboarding
- Tap a vessel icon to log instantly
- Qualitative progress in the Today's Nutrition view
- Visual progress bar fills throughout the day

### 6. GLP-1 Symptom Tracking

Track daily symptoms relevant to GLP-1 medications:
- Injection day (mark which day)
- Nausea
- Constipation
- Diarrhea
- Fatigue
- Appetite level

**Why this matters:** Correlates with nutrition data in weekly summaries.

Example weekly insight: "Protein was lowest on the two days after injections. Hydration also dropped." — that's actionable information the user can't get from any other tracker.

### 7. Weekly Summary (AI-Narrated, Backend-Computed)

Generated weekly. Stats engine computes, AI narrates.

**Stats engine calculates:**
- Average daily protein, fiber, hydration
- Lowest/highest macro meals and days
- Symptom correlations (nutrition vs injection timing)
- Trends week-over-week

**AI writes a narrative:**
> "Solid week — you consistently hit your protein target through lunch. Dinner tends to be lighter, which is common post-injection. Consider keeping cottage cheese or paneer on hand for those evenings. Hydration dropped on Thursday and Friday, which were your injection days — try setting a reminder those mornings."

Tone: encouraging, specific, actionable. Default personality (no user selection needed).

### 8. Dietary Preference Awareness

Set during onboarding. Ensures all AI suggestions respect dietary choices (won't suggest chicken to a vegetarian).

Options: Vegetarian / Vegan / Pescatarian / No restrictions / Custom

## Onboarding Flow

3 screens. Don't block first use:

1. **Welcome** — Brief: "You're on a GLP-1. This app helps make sure you're getting enough." One screen, one message.
2. **Sign in** — Email or Google
3. **Dietary preference** — Vegetarian / Vegan / Pescatarian / No restrictions / Custom

Done. Start logging immediately. Water vessel configuration, display name, and other preferences are accessible in settings — not gates.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React PWA (Vite)                │
│         Tailwind CSS · Mobile-first UI          │
│    Installable on phone home screen             │
└────────────────────┬────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────┐
│              API Gateway (REST)                 │
└──────┬──────────────┬───────────────┬───────────┘
       ▼              ▼               ▼
┌────────────┐ ┌────────────┐ ┌──────────────┐
│  Lambda:   │ │  Lambda:   │ │   Lambda:    │
│ Parse Food │ │  Stats +   │ │   CRUD       │
│ (→Bedrock) │ │  Narrative │ │  (logs,      │
│            │ │ (compute + │ │   foods,     │
│            │ │  Bedrock)  │ │   hydration, │
│            │ │            │ │   symptoms)  │
└─────┬──────┘ └─────┬──────┘ └──────┬───────┘
      │               │               │
      ▼               ▼               ▼
┌─────────────────────────────────────────────────┐
│                   DynamoDB                       │
│  Tables: Users · FoodLogs · FoodDictionary ·    │
│  HydrationLogs · SymptomLogs · WeeklySummaries  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│                   Cognito                        │
│          Auth (email / Google sign-in)           │
└─────────────────────────────────────────────────┘
```

## Data Model

### Users Table
| Field | Type | Purpose |
|---|---|---|
| userId (PK) | String | Cognito sub |
| displayName | String | Used in greetings (set in settings) |
| dietaryPreference | String | vegetarian, vegan, etc. |
| hydrationVessels | List | `[{name: "glass", oz: 12}, {name: "bottle", oz: 24}]` |
| proteinTarget | Number | Daily protein target in grams (default: 60) |
| fiberTarget | Number | Daily fiber target in grams (default: 25) |
| hydrationTarget | Number | Daily hydration target in oz (default: 64) |
| createdAt | String (ISO) | |

### FoodDictionary Table
| Field | Type | Purpose |
|---|---|---|
| userId (PK) | String | Personal per user |
| foodAlias (SK) | String | "fried egg", "spaghetti" |
| components | List | `[{item: "egg", qty: "1"}, {item: "olive oil", qty: "1/2 tsp"}]` |
| macros | Map | `{protein: 8, carbs: 0, fat: 7, fiber: 0, calories: 95}` |
| source | String | "ai_estimated" or "user_corrected" |
| updatedAt | String (ISO) | |

### FoodLogs Table
| Field | Type | Purpose |
|---|---|---|
| userId (PK) | String | Partition key |
| timestamp (SK) | String (ISO) | Sort key — enables date range queries |
| rawInput | String | Exactly what user typed |
| resolvedName | String | After dictionary lookup |
| macros | Map | `{protein: 8, carbs: 0, fat: 7, fiber: 0, calories: 95}` |
| mealSlot | String | breakfast/lunch/dinner/snack — inferred by time: before 11am = breakfast, 11am-2pm = lunch, 2pm-5pm = snack, after 5pm = dinner. User can override. |
| dictionaryRef | String | foodAlias if resolved from dictionary, null if AI-estimated |

### HydrationLogs Table
| Field | Type | Purpose |
|---|---|---|
| userId (PK) | String | |
| timestamp (SK) | String (ISO) | |
| vesselType | String | "glass" or "bottle" |
| oz | Number | Amount logged |

### SymptomLogs Table
| Field | Type | Purpose |
|---|---|---|
| userId (PK) | String | |
| date (SK) | String (YYYY-MM-DD) | One entry per day |
| injectionDay | Boolean | Whether user injected today |
| symptoms | Map | `{nausea: 2, fatigue: 1, constipation: 0, diarrhea: 0, appetite: 3}` (0-3 scale: none/mild/moderate/severe) |

### RecentFoodIndex Table
| Field | Type | Purpose |
|---|---|---|
| userId (PK) | String | |
| foodAlias (SK) | String | |
| lastUsed | String (ISO) | When this food was last logged |
| useCount | Number | Total times logged — surfaces in quick-add |

### WeeklySummaries Table
| Field | Type | Purpose |
|---|---|---|
| userId (PK) | String | |
| weekStart (SK) | String (ISO) | Monday date |
| narrativeText | String | AI-generated narrative |
| computedStats | Map | `{avgProtein: 62, avgFiber: 18, hydrationDays: 5, symptomCorrelations: [...]}` |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TypeScript + Tailwind CSS |
| PWA | Service worker + manifest for home screen install |
| State | Zustand or React Context |
| Auth | AWS Cognito (email + Google) |
| API | AWS API Gateway (REST) |
| Compute | AWS Lambda (Node.js/TypeScript) |
| AI | AWS Bedrock (Claude) |
| Database | AWS DynamoDB |
| Infra-as-code | AWS Amplify Gen 2 (TypeScript) |
| Deployment | Amplify (git push → deploy) |
| Scheduling | EventBridge (weekly summary cron) |

## Lambda Functions

| Function | Trigger | Purpose |
|---|---|---|
| parseFood | API Gateway POST | Raw text → FoodDictionary check → Bedrock if miss → return macros |
| logFood | API Gateway POST | Write to FoodLog + update RecentFoodIndex |
| logHydration | API Gateway POST | Write to HydrationLogs |
| logSymptoms | API Gateway POST | Write/update today's SymptomLogs entry |
| getTodayNutrition | API Gateway GET | Aggregate today's logs → compute qualitative status vs targets → return progress |
| getRecentFoods | API Gateway GET | Return frequently/recently used foods for quick-add |
| repeatMeal | API Gateway POST | Copy previous day's meal slot entries |
| updateFoodDictionary | API Gateway PUT | Save user correction as custom food |
| generateDailyNarrative | API Gateway GET | Stats engine computes today's status → Bedrock narrates qualitative summary + suggestions |
| generateWeeklySummary | EventBridge (Sunday 8pm) | Aggregate week + symptoms → compute stats → Bedrock narrates → store |
| getWeeklySummary | API Gateway GET | Return latest summary |

## AI Prompt Strategy

### Food Parsing
```
You are a nutrition assistant. The user ate: '{rawInput}'.
Estimate protein (g), carbs (g), fat (g), fiber (g), and calories.
Return JSON only. Be reasonable with portions — if ambiguous,
assume a typical single serving.
```

### Daily Narrative (called with pre-computed stats)
```
You are a supportive nutrition assistant for someone on GLP-1 medication.
Their dietary preference: {preference}.

Here is their nutrition status today:
- Protein: {currentProtein}g of {targetProtein}g target
- Fiber: {currentFiber}g of {targetFiber}g target
- Hydration: {currentOz}oz of {targetOz}oz target
- Time of day: {timeOfDay}

Write a brief, warm status for each macro (one sentence each).
If they're short on something and it's evening, suggest 2-4 specific
quick foods (under 5 min prep) that fit their dietary preference.
Never mention calories. Never shame.
```

### Weekly Summary (called with pre-computed stats + correlations)
```
You are a supportive nutrition coach for someone on GLP-1 medication.
Their dietary preference: {preference}.

Here are their computed stats for the week:
{weeklyStats}

Symptom-nutrition correlations found:
{correlations}

Write a 3-5 sentence narrative summary. Include:
- What they did well
- One pattern worth noting (especially symptom correlations)
- One specific, actionable suggestion that fits their diet
Never mention calories. Be encouraging and specific.
```

## Stretch Goals (Post-MVP)

- Photo-based food entry (camera → AI estimation)
- Hybrid AI + verified food database (USDA FoodData Central) for macro accuracy
- Goal setting (energy targets) with progress tracking
- Recipe/food suggestions based on flavor profile + dietary needs
- Cuisine-aware suggestions (vegetarian, loves crispy/spicy, etc.)
- Push notifications for hydration reminders on injection days
- Coach tone selection (encouraging / no-nonsense / playful)

## Platform

Mobile-responsive web app (PWA) for MVP. Installable on phone home screen for native-like experience. Native app consideration for post-MVP if push notifications or camera integration become critical.

## Cost Estimate (MVP)

- AWS Free Tier covers: Lambda (1M requests), DynamoDB (25GB), Cognito (50k MAU), Amplify hosting
- Bedrock (Claude): ~$0.01-0.05 per food parse, ~$0.02-0.05 per narrative/summary
- Realistic monthly cost for single-user testing: < $5
