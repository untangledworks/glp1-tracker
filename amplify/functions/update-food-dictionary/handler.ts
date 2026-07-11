import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.FOOD_DICTIONARY_TABLE || 'FoodDictionary';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { foodAlias, components, macros } = body;

  if (!foodAlias || !macros) {
    return { statusCode: 400, body: JSON.stringify({ error: 'foodAlias and macros are required' }) };
  }

  const entry = {
    id: randomUUID(),
    owner: userId,
    foodAlias: foodAlias.toLowerCase(),
    components: components || null,
    macros,
    source: 'USER_CORRECTED',
    updatedAt: new Date().toISOString(),
  };

  await client.send(new PutCommand({ TableName: TABLE, Item: entry }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  };
}
