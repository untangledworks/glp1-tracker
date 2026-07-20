import { defineFunction } from '@aws-amplify/backend';

export const logSymptoms = defineFunction({
  name: 'log-symptoms',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
