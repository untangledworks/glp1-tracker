import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const HYDRATION_TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';
const SYMPTOM_TABLE = process.env.SYMPTOM_LOG_TABLE || 'SymptomLog';
const USER_TABLE = process.env.USER_TABLE || 'User';
const SUMMARY_TABLE = process.env.WEEKLY_SUMMARY_TABLE || 'WeeklySummary';

function getPreviousWeekRange(): { start: string; end: string; weekStart: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);

  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);

  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  prevSunday.setHours(23, 59, 59, 999);

  return {
    start: prevMonday.toISOString(),
    end: prevSunday.toISOString(),
    weekStart: prevMonday.toISOString().split('T')[0],
  };
}

function computeSleepHours(bedTime: string, wakeTime: string): number {
  const [bedH, bedM] = bedTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  let bedMinutes = bedH * 60 + bedM;
  let wakeMinutes = wakeH * 60 + wakeM;
  if (wakeMinutes <= bedMinutes) wakeMinutes += 24 * 60;
  return (wakeMinutes - bedMinutes) / 60;
}

function findSymptomCorrelations(foodItems: any[], symptoms: any[]): string[] {
  const correlations: string[] = [];
  const injectionDays = symptoms.filter((s: any) => s.injectionDay).map((s: any) => s.date);

  if (injectionDays.length > 0) {
    const postInjectionDates = injectionDays.flatMap((d: string) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return [d, next.toISOString().split('T')[0]];
    });

    const postInjectionFoods = foodItems.filter((f: any) =>
      postInjectionDates.includes(f.timestamp?.split('T')[0])
    );
    const otherFoods = foodItems.filter((f: any) =>
      !postInjectionDates.includes(f.timestamp?.split('T')[0])
    );

    if (postInjectionFoods.length > 0 && otherFoods.length > 0) {
      const postAvgProtein = postInjectionFoods.reduce((s: number, f: any) => s + (f.macros?.protein || 0), 0) / Math.max(postInjectionDates.length, 1);
      const otherAvgProtein = otherFoods.reduce((s: number, f: any) => s + (f.macros?.protein || 0), 0) / Math.max(7 - postInjectionDates.length, 1);

      if (postAvgProtein < otherAvgProtein * 0.7) {
        correlations.push('Protein intake drops significantly on injection days and the day after.');
      }
    }

  }

  // Sleep on injection nights vs other nights
  const withSleep = symptoms.filter((s: any) => s.sleepBedTime && s.sleepWakeTime);
  if (withSleep.length >= 3 && injectionDays.length > 0) {
    const injectionSleep = withSleep.filter((s: any) => injectionDays.includes(s.date));
    const otherSleep = withSleep.filter((s: any) => !injectionDays.includes(s.date));

    if (injectionSleep.length > 0 && otherSleep.length > 0) {
      const avgInjSleep = injectionSleep.reduce((s: number, e: any) => s + computeSleepHours(e.sleepBedTime, e.sleepWakeTime), 0) / injectionSleep.length;
      const avgOtherSleep = otherSleep.reduce((s: number, e: any) => s + computeSleepHours(e.sleepBedTime, e.sleepWakeTime), 0) / otherSleep.length;

      if (avgInjSleep < avgOtherSleep - 0.75) {
        correlations.push(`Sleep is shorter on injection nights (avg ${avgInjSleep.toFixed(1)}h vs ${avgOtherSleep.toFixed(1)}h).`);
      }
    }
  }

  // Fatigue after poor sleep (independent of injection days)
  const withSleepAndSymptoms = symptoms.filter((s: any) => s.sleepBedTime && s.sleepWakeTime && s.symptoms?.fatigue !== undefined);
  if (withSleepAndSymptoms.length >= 3) {
    const shortSleepDays = withSleepAndSymptoms.filter((s: any) => computeSleepHours(s.sleepBedTime, s.sleepWakeTime) < 6.5);
    const normalSleepDays = withSleepAndSymptoms.filter((s: any) => computeSleepHours(s.sleepBedTime, s.sleepWakeTime) >= 6.5);

    if (shortSleepDays.length > 0 && normalSleepDays.length > 0) {
      const avgFatigueShort = shortSleepDays.reduce((s: number, e: any) => s + e.symptoms.fatigue, 0) / shortSleepDays.length;
      const avgFatigueNormal = normalSleepDays.reduce((s: number, e: any) => s + e.symptoms.fatigue, 0) / normalSleepDays.length;

      if (avgFatigueShort > avgFatigueNormal + 1) {
        correlations.push('Fatigue is noticeably higher on days following less than 6.5 hours of sleep.');
      }
    }
  }

  return correlations;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext?.authorizer?.claims?.sub;
  const { start, end, weekStart } = getPreviousWeekRange();

  // Check for cached summary first
  const cached = await db.send(new GetCommand({ TableName: SUMMARY_TABLE, Key: { owner: userId, weekStart } }));
  if (cached.Item) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ summary: cached.Item }),
    };
  }

  const [userResult, foodResult, hydrationResult, symptomResult] = await Promise.all([
    db.send(new GetCommand({ TableName: USER_TABLE, Key: { owner: userId } })),
    db.send(new QueryCommand({
      TableName: FOOD_LOG_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': start, ':end': end },
    })),
    db.send(new QueryCommand({
      TableName: HYDRATION_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': start, ':end': end },
    })),
    db.send(new QueryCommand({
      TableName: SYMPTOM_TABLE,
      KeyConditionExpression: '#owner = :uid AND #d BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#d': 'date' },
      ExpressionAttributeValues: { ':uid': userId, ':start': weekStart, ':end': end.split('T')[0] },
    })),
  ]);

  const user = userResult.Item || {};
  const foodItems = foodResult.Items || [];
  const hydrationItems = hydrationResult.Items || [];
  const symptomItems = symptomResult.Items || [];

  // Require at least 3 days of food logs to generate a meaningful summary
  const daysWithFood = new Set(foodItems.map((e: any) => e.timestamp?.split('T')[0])).size;
  if (daysWithFood < 3) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ summary: null }),
    };
  }

  const totalProtein = foodItems.reduce((s: number, e: any) => s + (e.macros?.protein || 0), 0);
  const totalFiber = foodItems.reduce((s: number, e: any) => s + (e.macros?.fiber || 0), 0);
  const totalCalories = foodItems.reduce((s: number, e: any) => s + (e.macros?.calories || 0), 0);
  const totalOz = hydrationItems.reduce((s: number, e: any) => s + (e.oz || 0), 0);
  const daysWithHydration = new Set(hydrationItems.map((e: any) => e.timestamp?.split('T')[0])).size;

  const avgProtein = Math.round(totalProtein / daysWithFood);
  const avgFiber = Math.round(totalFiber / daysWithFood);
  const avgCalories = Math.round(totalCalories / daysWithFood);
  const correlations = findSymptomCorrelations(foodItems, symptomItems);

  // Compute sleep stats
  const sleepEntries = symptomItems.filter((s: any) => s.sleepBedTime && s.sleepWakeTime);
  const avgSleepHours = sleepEntries.length > 0
    ? sleepEntries.reduce((s: number, e: any) => s + computeSleepHours(e.sleepBedTime, e.sleepWakeTime), 0) / sleepEntries.length
    : null;

  const computedStats = { avgProtein, avgFiber, avgCalories, hydrationDays: daysWithHydration, avgSleepHours, symptomCorrelations: correlations };

  const sleepLine = avgSleepHours !== null
    ? `- Average sleep: ${avgSleepHours.toFixed(1)} hours/night (${sleepEntries.length} nights logged)`
    : '- Sleep: not tracked this week';

  const prompt = `You are a supportive nutrition coach for someone on GLP-1 medication.
Their dietary preference: ${user.dietaryPreference || 'no restrictions'}.

Here are their computed stats for the week:
- Average daily calories: ${avgCalories}
- Average daily protein: ${avgProtein}g (target: ${user.proteinTarget || 60}g)
- Average daily fiber: ${avgFiber}g (target: ${user.fiberTarget || 25}g)
- Days with hydration logged: ${daysWithHydration}/7
- Injection days this week: ${symptomItems.filter((s: any) => s.injectionDay).length}
${sleepLine}

Symptom-nutrition correlations found:
${correlations.length > 0 ? correlations.join('\n') : 'No significant correlations detected.'}

Write a 3-5 sentence narrative summary. Include what they did well, one pattern worth noting (especially symptom or sleep correlations if any), and one specific actionable suggestion that fits their diet. If average calories are notably low (under 1000), gently suggest they may not be eating enough overall — but frame it qualitatively ("eating enough to fuel your body") rather than citing the number. If sleep is notably low (under 7 hours), mention it supportively. Be encouraging and specific.`;

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
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
  const narrativeText = responseBody.content[0].text;

  const nowIso = new Date().toISOString();
  const summary = {
    owner: userId,
    weekStart,
    narrativeText,
    computedStats,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.send(new PutCommand({ TableName: SUMMARY_TABLE, Item: summary }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ summary }),
  };
}
