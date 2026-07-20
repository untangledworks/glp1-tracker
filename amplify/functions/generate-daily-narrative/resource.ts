import { defineFunction } from '@aws-amplify/backend';

export const generateDailyNarrative = defineFunction({
  name: 'generate-daily-narrative',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
