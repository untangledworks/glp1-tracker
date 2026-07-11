import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: 'Solid week! You averaged 55g protein daily, up from last week. Fiber stayed consistent at 20g. Hydration dipped on injection days — try keeping a bottle by your bed those mornings.' }]
      }))
    })
  })),
  InvokeModelCommand: vi.fn(),
}));

const mockQuery = vi.fn();
const mockGet = vi.fn();
const mockPut = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: (cmd: any) => {
    if (cmd.constructor.name === 'QueryCommand') return mockQuery();
    if (cmd.constructor.name === 'GetCommand') return mockGet();
    if (cmd.constructor.name === 'PutCommand') return mockPut();
  }})) },
  QueryCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'QueryCommand' }, ...p })),
  GetCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'GetCommand' }, ...p })),
  PutCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'PutCommand' }, ...p })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

describe('generateWeeklySummaryHandler', () => {
  it('generates and stores a weekly summary', async () => {
    mockGet.mockResolvedValue({
      Item: { dietaryPreference: 'vegetarian', proteinTarget: 60, fiberTarget: 25, hydrationTarget: 64 }
    });
    mockQuery
      .mockResolvedValueOnce({ Items: Array(14).fill({ macros: { protein: 28, fiber: 10 }, timestamp: '2026-07-06T12:00:00.000Z' }) })
      .mockResolvedValueOnce({ Items: Array(10).fill({ oz: 12, timestamp: '2026-07-06T12:00:00.000Z' }) })
      .mockResolvedValueOnce({ Items: [
        { date: '2026-07-06', injectionDay: true, symptoms: { nausea: 2, fatigue: 1, constipation: 0, diarrhea: 0, appetite: 1 } },
        { date: '2026-07-07', injectionDay: false, symptoms: { nausea: 1, fatigue: 2, constipation: 0, diarrhea: 0, appetite: 1 } },
      ] });

    const event = {
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.summary.narrativeText).toContain('protein');
    expect(body.summary.computedStats).toHaveProperty('avgProtein');
  });
});
