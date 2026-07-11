import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SYMPTOM_LOG_TABLE || 'SymptomLog';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { date, injectionDay, symptoms } = body;

  if (!date || !symptoms) {
    return { statusCode: 400, body: JSON.stringify({ error: 'date and symptoms are required' }) };
  }

  const entry = {
    owner: userId,
    date,
    injectionDay: injectionDay || false,
    symptoms,
  };

  await client.send(new PutCommand({ TableName: TABLE, Item: entry }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  };
}
