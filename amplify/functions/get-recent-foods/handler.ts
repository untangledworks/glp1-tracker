import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.RECENT_FOOD_TABLE || 'RecentFoodIndex';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;

  const result = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: '#owner = :uid',
    ExpressionAttributeNames: { '#owner': 'owner' },
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false,
    Limit: 20,
  }));

  const foods = (result.Items || []).sort((a: any, b: any) => b.useCount - a.useCount);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foods }),
  };
}
