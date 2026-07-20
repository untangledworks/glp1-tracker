import { defineFunction } from '@aws-amplify/backend';

export const repeatMeal = defineFunction({
  name: 'repeat-meal',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
