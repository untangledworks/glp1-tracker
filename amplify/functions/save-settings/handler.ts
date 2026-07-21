import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USER_TABLE = process.env.USER_TABLE || 'User';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');

  const existing = await client.send(new GetCommand({ TableName: USER_TABLE, Key: { owner: userId } }));
  const now = new Date().toISOString();
  const item: Record<string, any> = {
    owner: userId,
    createdAt: existing.Item?.createdAt || now,
    updatedAt: now,
  };

  if (body.dietaryPreference !== undefined) item.dietaryPreference = body.dietaryPreference;
  if (body.proteinTarget !== undefined) item.proteinTarget = body.proteinTarget;
  if (body.fiberTarget !== undefined) item.fiberTarget = body.fiberTarget;
  if (body.hydrationTarget !== undefined) item.hydrationTarget = body.hydrationTarget;
  if (body.displayName !== undefined) item.displayName = body.displayName;
  if (body.hydrationVessels !== undefined) item.hydrationVessels = body.hydrationVessels;
  if (body.weightLbs !== undefined) item.weightLbs = body.weightLbs;
  if (body.injectionDayOfWeek !== undefined) item.injectionDayOfWeek = body.injectionDayOfWeek;
  if (body.sleepTrackingEnabled !== undefined) item.sleepTrackingEnabled = body.sleepTrackingEnabled;

  await client.send(new PutCommand({
    TableName: USER_TABLE,
    Item: item,
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ settings: item }),
  };
}
