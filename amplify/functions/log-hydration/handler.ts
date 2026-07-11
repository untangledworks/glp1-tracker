import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { vesselType, oz } = body;

  if (!vesselType || typeof oz !== 'number') {
    return { statusCode: 400, body: JSON.stringify({ error: 'vesselType and oz are required' }) };
  }

  const entry = {
    id: randomUUID(),
    owner: userId,
    timestamp: new Date().toISOString(),
    vesselType,
    oz,
  };

  await client.send(new PutCommand({ TableName: TABLE, Item: entry }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  };
}
