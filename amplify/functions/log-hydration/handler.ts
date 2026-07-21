import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { vesselType, oz, localDate } = body;

  if (!vesselType || typeof oz !== 'number') {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'vesselType and oz are required' }) };
  }

  const now = new Date();
  const timeComponent = now.toISOString().split('T')[1];
  const dateComponent = localDate || now.toISOString().split('T')[0];

  const entry = {
    owner: userId,
    timestamp: `${dateComponent}T${timeComponent}`,
    vesselType,
    oz,
  };

  await client.send(new PutCommand({ TableName: TABLE, Item: entry }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ entry }),
  };
}
