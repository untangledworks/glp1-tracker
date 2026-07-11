import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

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

describe('getTodayHandler', () => {
  it('returns aggregated nutrition status', async () => {
    mockGet.mockResolvedValue({
      Item: { proteinTarget: 60, fiberTarget: 25, hydrationTarget: 64 }
    });
    mockQuery
      .mockResolvedValueOnce({
        Items: [
          { macros: { protein: 20, carbs: 10, fat: 5, fiber: 3, calories: 165 }, rawInput: 'eggs', mealSlot: 'BREAKFAST', timestamp: '2026-07-09T08:00:00Z', resolvedName: 'eggs', id: '1', dictionaryRef: null },
          { macros: { protein: 12, carbs: 4, fat: 0, fiber: 0, calories: 64 }, rawInput: 'yogurt', mealSlot: 'BREAKFAST', timestamp: '2026-07-09T09:00:00Z', resolvedName: 'yogurt', id: '2', dictionaryRef: null },
        ]
      })
      .mockResolvedValueOnce({
        Items: [
          { vesselType: 'glass', oz: 12, timestamp: '2026-07-09T08:30:00Z', id: '3' },
        ]
      });

    const event = {
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
      queryStringParameters: { date: '2026-07-09' },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.nutrition.protein.current).toBe(32);
    expect(body.nutrition.protein.target).toBe(60);
    expect(body.nutrition.protein.color).toBe('yellow');
    expect(body.hydration.totalOz).toBe(12);
  });
});
