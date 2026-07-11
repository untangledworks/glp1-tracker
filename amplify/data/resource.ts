import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

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

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
