import { defineFunction } from '@aws-amplify/backend';

export const generateWeeklySummary = defineFunction({
  name: 'generate-weekly-summary',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
