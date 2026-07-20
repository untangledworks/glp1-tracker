import { defineFunction } from '@aws-amplify/backend';

export const logFood = defineFunction({
  name: 'log-food',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
