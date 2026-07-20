import type { Macros, FoodLogEntry, HydrationLogEntry, SymptomLogEntry, NutritionStatus, MealSlot } from '../types';

const MOCK_USER = 'mock-user-123';

function delay(ms = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let foodLog: FoodLogEntry[] = [];
let hydrationLog: HydrationLogEntry[] = [];

const mockFoods: Record<string, Macros> = {
  'greek yogurt': { protein: 15, carbs: 6, fat: 0, fiber: 0, calories: 100 },
  'fried egg': { protein: 6, carbs: 0, fat: 5, fiber: 0, calories: 70 },
  'chicken breast': { protein: 31, carbs: 0, fat: 3, fiber: 0, calories: 165 },
  'banana': { protein: 1, carbs: 27, fat: 0, fiber: 3, calories: 105 },
  'oatmeal': { protein: 5, carbs: 27, fat: 3, fiber: 4, calories: 150 },
  'salmon': { protein: 25, carbs: 0, fat: 12, fiber: 0, calories: 208 },
  'broccoli': { protein: 3, carbs: 6, fat: 0, fiber: 2, calories: 31 },
};

function inferMealSlot(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

function computeNutrition(): NutritionStatus {
  const totals = foodLog.reduce(
    (acc, e) => ({
      protein: acc.protein + e.macros.protein,
      fiber: acc.fiber + e.macros.fiber,
    }),
    { protein: 0, fiber: 0 }
  );
  const totalOz = hydrationLog.reduce((s, e) => s + e.oz, 0);

  function color(current: number, target: number): 'green' | 'yellow' | 'red' {
    const ratio = current / target;
    if (ratio >= 0.8) return 'green';
    if (ratio >= 0.5) return 'yellow';
    return 'red';
  }

  function label(current: number, target: number, name: string): string {
    const ratio = current / target;
    if (ratio >= 1) return 'Excellent.';
    if (ratio >= 0.8) return `Almost there. ${target - current}g more gets you to target.`;
    if (ratio >= 0.5) return 'A little low today.';
    return `${name} needs attention today.`;
  }

  return {
    protein: { current: totals.protein, target: 60, label: label(totals.protein, 60, 'Protein'), color: color(totals.protein, 60) },
    fiber: { current: totals.fiber, target: 25, label: label(totals.fiber, 25, 'Fiber'), color: color(totals.fiber, 25) },
    hydration: { current: totalOz, target: 64, label: label(totalOz, 64, 'Hydration'), color: color(totalOz, 64) },
  };
}

export const mockApi = {
  async parseFood(rawInput: string): Promise<{ macros: Macros; resolvedName: string }> {
    await delay();
    const key = rawInput.toLowerCase().trim();
    const macros = mockFoods[key] || { protein: 8, carbs: 15, fat: 4, fiber: 2, calories: 120 };
    return { macros, resolvedName: rawInput.trim() };
  },

  async logFood(data: { rawInput: string; resolvedName: string; macros: Macros; mealSlot?: MealSlot }): Promise<{ entry: FoodLogEntry }> {
    await delay(200);
    const entry: FoodLogEntry = {
      owner: MOCK_USER,
      timestamp: new Date().toISOString(),
      rawInput: data.rawInput,
      resolvedName: data.resolvedName,
      macros: data.macros,
      mealSlot: data.mealSlot || inferMealSlot(),
      dictionaryRef: null,
    };
    foodLog.push(entry);
    return { entry };
  },

  async logHydration(vesselType: string, oz: number): Promise<{ entry: HydrationLogEntry }> {
    await delay(150);
    const entry: HydrationLogEntry = {
      owner: MOCK_USER,
      timestamp: new Date().toISOString(),
      vesselType,
      oz,
    };
    hydrationLog.push(entry);
    return { entry };
  },

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

  async getToday(): Promise<{ nutrition: NutritionStatus; entries: FoodLogEntry[]; hydration: { totalOz: number; entries: HydrationLogEntry[] } }> {
    await delay(200);
    const totalOz = hydrationLog.reduce((s, e) => s + e.oz, 0);
    return {
      nutrition: computeNutrition(),
      entries: [...foodLog],
      hydration: { totalOz, entries: [...hydrationLog] },
    };
  },

  async getRecentFoods(): Promise<{ foods: { foodAlias: string; lastUsed: string; useCount: number }[] }> {
    await delay(150);
    return {
      foods: [
        { foodAlias: 'greek yogurt', lastUsed: new Date().toISOString(), useCount: 5 },
        { foodAlias: 'fried egg', lastUsed: new Date().toISOString(), useCount: 4 },
        { foodAlias: 'oatmeal', lastUsed: new Date().toISOString(), useCount: 3 },
        { foodAlias: 'chicken breast', lastUsed: new Date().toISOString(), useCount: 2 },
        { foodAlias: 'banana', lastUsed: new Date().toISOString(), useCount: 2 },
      ],
    };
  },

  async repeatMeal(mealSlot: MealSlot): Promise<{ entries: FoodLogEntry[] }> {
    await delay(300);
    const entry: FoodLogEntry = {
      owner: MOCK_USER,
      timestamp: new Date().toISOString(),
      rawInput: 'greek yogurt',
      resolvedName: 'Greek Yogurt',
      macros: mockFoods['greek yogurt'],
      mealSlot,
      dictionaryRef: null,
    };
    foodLog.push(entry);
    return { entries: [entry] };
  },

  async updateFoodDictionary(data: { foodAlias: string; macros: Macros }): Promise<{ entry: any }> {
    await delay(200);
    return { entry: { ...data, owner: MOCK_USER, source: 'USER_CORRECTED', updatedAt: new Date().toISOString() } };
  },

  async getDailyNarrative(): Promise<{ narrative: string; suggestions: string[] }> {
    await delay(400);
    const nutrition = computeNutrition();
    if (nutrition.protein.color === 'green') {
      return { narrative: "Great job today! You're hitting your protein target and staying hydrated.", suggestions: [] };
    }
    return {
      narrative: "You're making progress today. A little more protein would get you to your target — there's still time!",
      suggestions: ['Greek yogurt', 'Cottage cheese', 'Protein shake', 'Handful of almonds'],
    };
  },

  async getWeeklySummary(): Promise<{ summary: { narrativeText: string; computedStats: any } }> {
    await delay(400);
    return {
      summary: {
        narrativeText: "Solid week — you consistently hit your protein target through lunch. Dinner tends to be lighter, which is common post-injection. Consider keeping cottage cheese or paneer on hand for those evenings. Hydration dropped on Thursday and Friday, which were your injection days — try setting a reminder those mornings.",
        computedStats: {
          avgProtein: 52,
          avgFiber: 18,
          hydrationDays: 5,
          symptomCorrelations: ['Protein intake drops significantly on injection days and the day after.'],
        },
      },
    };
  },
};
