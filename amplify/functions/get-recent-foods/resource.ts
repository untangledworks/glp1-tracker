import { defineFunction } from '@aws-amplify/backend';

export const getRecentFoods = defineFunction({
  name: 'get-recent-foods',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
