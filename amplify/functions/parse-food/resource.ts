import { defineFunction } from '@aws-amplify/backend';

export const parseFood = defineFunction({
  name: 'parse-food',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
