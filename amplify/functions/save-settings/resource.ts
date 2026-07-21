import { defineFunction } from '@aws-amplify/backend';

export const saveSettings = defineFunction({
  name: 'save-settings',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
