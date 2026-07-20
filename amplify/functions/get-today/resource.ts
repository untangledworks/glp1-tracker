import { defineFunction } from '@aws-amplify/backend';

export const getToday = defineFunction({
  name: 'get-today',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
