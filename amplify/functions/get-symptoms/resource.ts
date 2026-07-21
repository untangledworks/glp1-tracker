import { defineFunction } from '@aws-amplify/backend';

export const getSymptoms = defineFunction({
  name: 'get-symptoms',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
