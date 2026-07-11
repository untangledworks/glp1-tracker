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
