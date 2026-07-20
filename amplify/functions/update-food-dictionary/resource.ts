import { defineFunction } from '@aws-amplify/backend';

export const updateFoodDictionary = defineFunction({
  name: 'update-food-dictionary',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
