import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const HYDRATION_TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';
const USER_TABLE = process.env.USER_TABLE || 'User';

function computeColor(current: number, target: number): 'green' | 'yellow' | 'red' {
  const ratio = current / target;
  if (ratio >= 0.8) return 'green';
  if (ratio >= 0.5) return 'yellow';
  return 'red';
}

function computeLabel(current: number, target: number, nutrient: string): string {
  const ratio = current / target;
  if (ratio >= 1) return 'Excellent.';
  if (ratio >= 0.8) {
    const remaining = target - current;
    return `Almost there. ${remaining}g more gets you to target.`;
  }
  if (ratio >= 0.5) return 'A little low today.';
  return `${nutrient} needs attention today.`;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [userResult, foodResult, hydrationResult] = await Promise.all([
    client.send(new GetCommand({ TableName: USER_TABLE, Key: { owner: userId } })),
    client.send(new QueryCommand({
      TableName: FOOD_LOG_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
    client.send(new QueryCommand({
      TableName: HYDRATION_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
  ]);

  const targets = {
    protein: userResult.Item?.proteinTarget || 60,
    fiber: userResult.Item?.fiberTarget || 25,
    hydration: userResult.Item?.hydrationTarget || 64,
  };

  const entries = foodResult.Items || [];
  const totalProtein = entries.reduce((sum: number, e: any) => sum + (e.macros?.protein || 0), 0);
  const totalFiber = entries.reduce((sum: number, e: any) => sum + (e.macros?.fiber || 0), 0);

  const hydrationEntries = hydrationResult.Items || [];
  const totalOz = hydrationEntries.reduce((sum: number, e: any) => sum + (e.oz || 0), 0);

  const nutrition = {
    protein: {
      current: totalProtein,
      target: targets.protein,
      label: computeLabel(totalProtein, targets.protein, 'Protein'),
      color: computeColor(totalProtein, targets.protein),
    },
    fiber: {
      current: totalFiber,
      target: targets.fiber,
      label: computeLabel(totalFiber, targets.fiber, 'Fiber'),
      color: computeColor(totalFiber, targets.fiber),
    },
    hydration: {
      current: totalOz,
      target: targets.hydration,
      label: computeLabel(totalOz, targets.hydration, 'Hydration'),
      color: computeColor(totalOz, targets.hydration),
    },
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ nutrition, entries, hydration: { totalOz, entries: hydrationEntries } }),
  };
}
