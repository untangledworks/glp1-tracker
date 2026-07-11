import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito authentication configuration
 *
 * Email sign-in is active.
 * Google OAuth is commented out pending environment variable configuration.
 *
 * To enable Google OAuth:
 * 1. Create Google OAuth 2.0 credentials in Google Cloud Console
 * 2. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables
 * 3. Uncomment the google block below
 * 4. Update callbackUrls and logoutUrls with your production domain
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    // Google OAuth - commented out until env vars are configured
    // externalProviders: {
    //   google: {
    //     clientId: process.env.GOOGLE_CLIENT_ID!,
    //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //     scopes: ['email', 'profile'],
    //   },
    //   callbackUrls: ['http://localhost:5173/', 'https://main.YOUR_APP.amplifyapp.com/'],
    //   logoutUrls: ['http://localhost:5173/', 'https://main.YOUR_APP.amplifyapp.com/'],
    // },
  },
  userAttributes: {
    preferredUsername: { required: false, mutable: true },
  },
});
