import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

const mockQuery = vi.fn();
const mockPut = vi.fn().mockResolvedValue({});
const mockUpdate = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: (cmd: any) => {
    if (cmd.constructor.name === 'QueryCommand') return mockQuery();
    if (cmd.constructor.name === 'PutCommand') return mockPut();
    if (cmd.constructor.name === 'UpdateCommand') return mockUpdate();
  }})) },
  QueryCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'QueryCommand' }, ...p })),
  PutCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'PutCommand' }, ...p })),
  UpdateCommand: vi.fn().mockImplementation((p) => ({ constructor: { name: 'UpdateCommand' }, ...p })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

describe('repeatMealHandler', () => {
  it('copies yesterday breakfast entries to today', async () => {
    mockQuery.mockResolvedValue({
      Items: [
        { rawInput: 'greek yogurt', resolvedName: 'greek yogurt', macros: { protein: 12, carbs: 4, fat: 0, fiber: 0, calories: 64 }, mealSlot: 'BREAKFAST', dictionaryRef: null },
        { rawInput: 'fried egg', resolvedName: 'fried egg', macros: { protein: 10, carbs: 0, fat: 7, fiber: 0, calories: 103 }, mealSlot: 'BREAKFAST', dictionaryRef: 'fried egg' },
      ]
    });

    const event = {
      body: JSON.stringify({ mealSlot: 'BREAKFAST' }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.entries).toHaveLength(2);
  });

  it('returns 400 for missing mealSlot', async () => {
    const event = {
      body: JSON.stringify({}),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });
});
