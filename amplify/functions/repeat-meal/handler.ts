import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const RECENT_FOOD_TABLE = process.env.RECENT_FOOD_TABLE || 'RecentFoodIndex';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { mealSlot, sourceDate } = body;

  if (!mealSlot) {
    return { statusCode: 400, body: JSON.stringify({ error: 'mealSlot is required' }) };
  }

  const yesterday = sourceDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dayStart = `${yesterday}T00:00:00.000Z`;
  const dayEnd = `${yesterday}T23:59:59.999Z`;

  const queryResult = await client.send(new QueryCommand({
    TableName: FOOD_LOG_TABLE,
    KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
    FilterExpression: '#slot = :slot',
    ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp', '#slot': 'mealSlot' },
    ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd, ':slot': mealSlot },
  }));

  const sourceEntries = queryResult.Items || [];
  const now = Date.now();
  const newEntries = [];

  for (let i = 0; i < sourceEntries.length; i++) {
    const entry = sourceEntries[i];
    const newEntry = {
      owner: userId,
      timestamp: new Date(now + i).toISOString(),
      rawInput: entry.rawInput,
      resolvedName: entry.resolvedName,
      macros: entry.macros,
      mealSlot: entry.mealSlot,
      dictionaryRef: entry.dictionaryRef,
    };

    await client.send(new PutCommand({ TableName: FOOD_LOG_TABLE, Item: newEntry }));

    await client.send(new UpdateCommand({
      TableName: RECENT_FOOD_TABLE,
      Key: { owner: userId, foodAlias: (entry.resolvedName || entry.rawInput).toLowerCase() },
      UpdateExpression: 'SET lastUsed = :now, useCount = if_not_exists(useCount, :zero) + :one',
      ExpressionAttributeValues: { ':now': newEntry.timestamp, ':zero': 0, ':one': 1 },
    }));

    newEntries.push(newEntry);
  }

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: newEntries }),
  };
}
