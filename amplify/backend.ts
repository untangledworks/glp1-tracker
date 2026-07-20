import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { parseFood } from './functions/parse-food/resource';
import { logFood } from './functions/log-food/resource';
import { logHydration } from './functions/log-hydration/resource';
import { logSymptoms } from './functions/log-symptoms/resource';
import { getToday } from './functions/get-today/resource';
import { getRecentFoods } from './functions/get-recent-foods/resource';
import { repeatMeal } from './functions/repeat-meal/resource';
import { updateFoodDictionary } from './functions/update-food-dictionary/resource';
import { generateDailyNarrative } from './functions/generate-daily-narrative/resource';
import { generateWeeklySummary } from './functions/generate-weekly-summary/resource';

const backend = defineBackend({
  auth,
  data,
  parseFood,
  logFood,
  logHydration,
  logSymptoms,
  getToday,
  getRecentFoods,
  repeatMeal,
  updateFoodDictionary,
  generateDailyNarrative,
  generateWeeklySummary,
});

// Get references to the DynamoDB tables created by Amplify Data
const dataStack = Stack.of(backend.data);
const tables = backend.data.resources.tables;

// Map of function → which tables it needs access to
const functionTableAccess: Record<string, { fn: any; tables: string[] }> = {
  logFood: { fn: backend.logFood, tables: ['FoodLog', 'RecentFoodIndex'] },
  logHydration: { fn: backend.logHydration, tables: ['HydrationLog'] },
  logSymptoms: { fn: backend.logSymptoms, tables: ['SymptomLog'] },
  getToday: { fn: backend.getToday, tables: ['FoodLog', 'HydrationLog', 'User'] },
  getRecentFoods: { fn: backend.getRecentFoods, tables: ['RecentFoodIndex'] },
  repeatMeal: { fn: backend.repeatMeal, tables: ['FoodLog', 'RecentFoodIndex'] },
  updateFoodDictionary: { fn: backend.updateFoodDictionary, tables: ['FoodDictionary'] },
  generateDailyNarrative: { fn: backend.generateDailyNarrative, tables: ['FoodLog', 'HydrationLog', 'User'] },
  generateWeeklySummary: { fn: backend.generateWeeklySummary, tables: ['FoodLog', 'HydrationLog', 'SymptomLog', 'User', 'WeeklySummary'] },
};

// Grant DynamoDB access and set table name env vars
for (const [, config] of Object.entries(functionTableAccess)) {
  for (const tableName of config.tables) {
    const table = tables[tableName];
    if (table) {
      table.grantReadWriteData(config.fn.resources.lambda);
      config.fn.addEnvironment(
        `${tableName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_TABLE`,
        table.tableName
      );
    }
  }
}

// Grant Bedrock access to functions that call Claude
const bedrockPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['bedrock:InvokeModel'],
  resources: [
    'arn:aws:bedrock:*::foundation-model/anthropic.*',
    'arn:aws:bedrock:*:*:inference-profile/us.anthropic.*',
  ],
});

backend.parseFood.resources.lambda.role?.attachInlinePolicy(
  new Policy(Stack.of(backend.parseFood), 'ParseFoodBedrockPolicy', { statements: [bedrockPolicy] })
);
backend.generateDailyNarrative.resources.lambda.role?.attachInlinePolicy(
  new Policy(Stack.of(backend.generateDailyNarrative), 'NarrativeBedrockPolicy', { statements: [bedrockPolicy] })
);
backend.generateWeeklySummary.resources.lambda.role?.attachInlinePolicy(
  new Policy(Stack.of(backend.generateWeeklySummary), 'SummaryBedrockPolicy', { statements: [bedrockPolicy] })
);

// Create REST API with Cognito authorizer
const apiStack = backend.createStack('ApiStack');
const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(apiStack, 'CognitoAuth', {
  cognitoUserPools: [backend.auth.resources.userPool],
});

const api = new apigateway.RestApi(apiStack, 'GLP1TrackerApi', {
  restApiName: 'glp1-tracker-api',
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});

const authOptions: apigateway.MethodOptions = {
  authorizer: cognitoAuthorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
};

// Wire routes → Lambda functions
const routes: { path: string; method: string; fn: any }[] = [
  { path: 'parse-food', method: 'POST', fn: backend.parseFood },
  { path: 'log-food', method: 'POST', fn: backend.logFood },
  { path: 'log-hydration', method: 'POST', fn: backend.logHydration },
  { path: 'log-symptoms', method: 'POST', fn: backend.logSymptoms },
  { path: 'get-today', method: 'GET', fn: backend.getToday },
  { path: 'get-recent-foods', method: 'GET', fn: backend.getRecentFoods },
  { path: 'repeat-meal', method: 'POST', fn: backend.repeatMeal },
  { path: 'update-food-dictionary', method: 'PUT', fn: backend.updateFoodDictionary },
  { path: 'generate-daily-narrative', method: 'GET', fn: backend.generateDailyNarrative },
  { path: 'get-weekly-summary', method: 'GET', fn: backend.generateWeeklySummary },
];

for (const route of routes) {
  const resource = api.root.addResource(route.path);
  resource.addMethod(
    route.method,
    new apigateway.LambdaIntegration(route.fn.resources.lambda),
    authOptions
  );
}

// Output the API URL so the frontend can use it
backend.addOutput({
  custom: {
    apiUrl: api.url,
  },
});
