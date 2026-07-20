import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const HYDRATION_TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';
const USER_TABLE = process.env.USER_TABLE || 'User';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [userResult, foodResult, hydrationResult] = await Promise.all([
    db.send(new GetCommand({ TableName: USER_TABLE, Key: { owner: userId } })),
    db.send(new QueryCommand({
      TableName: FOOD_LOG_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
    db.send(new QueryCommand({
      TableName: HYDRATION_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
  ]);

  const user = userResult.Item || {};
  const entries = foodResult.Items || [];
  const hydrationEntries = hydrationResult.Items || [];

  const totalProtein = entries.reduce((s: number, e: any) => s + (e.macros?.protein || 0), 0);
  const totalFiber = entries.reduce((s: number, e: any) => s + (e.macros?.fiber || 0), 0);
  const totalOz = hydrationEntries.reduce((s: number, e: any) => s + (e.oz || 0), 0);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const prompt = `You are a supportive nutrition assistant for someone on GLP-1 medication.
Their dietary preference: ${user.dietaryPreference || 'no restrictions'}.

Here is their nutrition status today:
- Protein: ${totalProtein}g of ${user.proteinTarget || 60}g target
- Fiber: ${totalFiber}g of ${user.fiberTarget || 25}g target
- Hydration: ${totalOz}oz of ${user.hydrationTarget || 64}oz target
- Time of day: ${timeOfDay}

Return ONLY valid JSON: {"narrative": "2-3 sentence status", "suggestions": ["food1", "food2", "food3"]}
The narrative should be warm and encouraging. If they're short on something and it's evening, include specific quick foods (under 5 min prep) in suggestions.
Never mention calories. Never shame. Respect their dietary preference.`;

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-sonnet-5-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const aiResponse = JSON.parse(responseBody.content[0].text);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiResponse),
  };
}
