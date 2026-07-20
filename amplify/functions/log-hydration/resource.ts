import { defineFunction } from '@aws-amplify/backend';

export const logHydration = defineFunction({
  name: 'log-hydration',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
