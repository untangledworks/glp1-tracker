import { defineFunction } from '@aws-amplify/backend';

export const getSettings = defineFunction({
  name: 'get-settings',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
