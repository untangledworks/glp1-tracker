import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SYMPTOM_LOG_TABLE || 'SymptomLog';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];

  const result = await client.send(new GetCommand({
    TableName: TABLE,
    Key: { owner: userId, date },
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ entry: result.Item || null }),
  };
}
