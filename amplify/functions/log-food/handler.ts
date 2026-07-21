import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const RECENT_FOOD_TABLE = process.env.RECENT_FOOD_INDEX_TABLE || 'RecentFoodIndex';

function inferMealSlot(hour: number): string {
  if (hour < 11) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { rawInput, resolvedName, macros, mealSlot, dictionaryRef, localDate } = body;

  if (!rawInput || !macros) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'rawInput and macros are required' }) };
  }

  const now = new Date();
  const timeComponent = now.toISOString().split('T')[1];
  const dateComponent = localDate || now.toISOString().split('T')[0];
  const timestamp = `${dateComponent}T${timeComponent}`;
  const inferredSlot = mealSlot || inferMealSlot(now.getHours());

  const now_iso = now.toISOString();
  const entry = {
    owner: userId,
    timestamp,
    rawInput,
    resolvedName: resolvedName || rawInput,
    macros,
    mealSlot: inferredSlot,
    dictionaryRef: dictionaryRef || null,
    createdAt: now_iso,
    updatedAt: now_iso,
  };

  await client.send(new PutCommand({
    TableName: FOOD_LOG_TABLE,
    Item: entry,
  }));

  await client.send(new UpdateCommand({
    TableName: RECENT_FOOD_TABLE,
    Key: { owner: userId, foodAlias: (resolvedName || rawInput).toLowerCase() },
    UpdateExpression: 'SET lastUsed = :now, useCount = if_not_exists(useCount, :zero) + :one',
    ExpressionAttributeValues: { ':now': timestamp, ':zero': 0, ':one': 1 },
  }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ entry }),
  };
}
