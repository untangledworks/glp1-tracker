import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: JSON.stringify({
          narrative: "You're doing great on protein today. Fiber is a bit low — try adding some berries.",
          suggestions: ["Raspberries", "Chia seeds", "Lentil soup"]
        }) }]
      }))
    })
  })),
  InvokeModelCommand: vi.fn(),
}));

const mockQuery = vi.fn();
const mockGet = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: (cmd: any) => {
    if (cmd.constructor.name === 'QueryCommand') return mockQuery();
    if (cmd.constructor.name === 'GetCommand') return mockGet();
  }})) },
  QueryCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'QueryCommand' }, ...p })),
  GetCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'GetCommand' }, ...p })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

describe('generateDailyNarrativeHandler', () => {
  it('returns AI narrative with suggestions', async () => {
    mockGet.mockResolvedValue({
      Item: { proteinTarget: 60, fiberTarget: 25, hydrationTarget: 64, dietaryPreference: 'vegetarian' }
    });
    mockQuery
      .mockResolvedValueOnce({ Items: [{ macros: { protein: 40, carbs: 20, fat: 10, fiber: 8, calories: 330 } }] })
      .mockResolvedValueOnce({ Items: [{ oz: 32 }] });

    const event = {
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
      queryStringParameters: { date: '2026-07-09' },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.narrative).toContain('protein');
    expect(body.suggestions).toBeInstanceOf(Array);
  });
});
