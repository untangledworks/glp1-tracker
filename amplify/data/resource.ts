import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    owner: a.string().required(),
    displayName: a.string(),
    dietaryPreference: a.string().required(),
    hydrationVessels: a.json(),
    proteinTarget: a.integer().default(60),
    fiberTarget: a.integer().default(25),
    hydrationTarget: a.integer().default(64),
    weightLbs: a.float(),
    injectionDayOfWeek: a.string(),
    sleepTrackingEnabled: a.boolean().default(false),
  }).identifier(['owner'])
    .authorization(allow => [allow.owner()]),

  FoodLog: a.model({
    owner: a.string().required(),
    timestamp: a.datetime().required(),
    rawInput: a.string().required(),
    resolvedName: a.string(),
    macros: a.json().required(),
    mealSlot: a.enum(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']),
    dictionaryRef: a.string(),
  }).identifier(['owner', 'timestamp'])
    .authorization(allow => [allow.owner()]),

  FoodDictionary: a.model({
    owner: a.string().required(),
    foodAlias: a.string().required(),
    components: a.json(),
    macros: a.json().required(),
    source: a.enum(['AI_ESTIMATED', 'USER_CORRECTED']),
    updatedAt: a.datetime(),
  }).identifier(['owner', 'foodAlias'])
    .authorization(allow => [allow.owner()]),

  HydrationLog: a.model({
    owner: a.string().required(),
    timestamp: a.datetime().required(),
    vesselType: a.string().required(),
    oz: a.integer().required(),
  }).identifier(['owner', 'timestamp'])
    .authorization(allow => [allow.owner()]),

  SymptomLog: a.model({
    owner: a.string().required(),
    date: a.date().required(),
    injectionDay: a.boolean().default(false),
    symptoms: a.json().required(),
  }).identifier(['owner', 'date'])
    .authorization(allow => [allow.owner()]),

  RecentFoodIndex: a.model({
    owner: a.string().required(),
    foodAlias: a.string().required(),
    lastUsed: a.datetime().required(),
    useCount: a.integer().default(1),
  }).identifier(['owner', 'foodAlias'])
    .authorization(allow => [allow.owner()]),

  WeeklySummary: a.model({
    owner: a.string().required(),
    weekStart: a.date().required(),
    narrativeText: a.string().required(),
    computedStats: a.json().required(),
  }).identifier(['owner', 'weekStart'])
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
