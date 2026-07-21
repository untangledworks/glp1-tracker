import { defineFunction } from '@aws-amplify/backend';

export const deleteFood = defineFunction({
  name: 'delete-food',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
