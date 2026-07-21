import { defineFunction } from '@aws-amplify/backend';

export const deleteHydration = defineFunction({
  name: 'delete-hydration',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
