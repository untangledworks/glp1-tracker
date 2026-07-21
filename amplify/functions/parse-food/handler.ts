import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const PROMPT_TEMPLATE = `You are a nutrition assistant. The user ate: '{INPUT}'.
Estimate protein (g), carbs (g), fat (g), fiber (g), and calories.
Return ONLY valid JSON in this exact format: {"protein": N, "carbs": N, "fat": N, "fiber": N, "calories": N}
Be reasonable with portions — if ambiguous, assume a typical single serving.`;

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { rawInput } = body;

  if (!rawInput || typeof rawInput !== 'string') {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'rawInput is required' }) };
  }

  const prompt = PROMPT_TEMPLATE.replace('{INPUT}', rawInput);

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const macrosText = responseBody.content[0].text;

  const cleaned = macrosText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const macros = JSON.parse(cleaned);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ macros, resolvedName: rawInput }),
  };
}
