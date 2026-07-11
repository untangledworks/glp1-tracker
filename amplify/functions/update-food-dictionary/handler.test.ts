import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

const mockPut = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn().mockResolvedValue({}) })) },
  PutCommand: vi.fn().mockImplementation((params) => ({ constructor: { name: 'PutCommand' }, ...params })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

describe('updateFoodDictionaryHandler', () => {
  it('saves a custom food definition', async () => {
    const event = {
      body: JSON.stringify({
        foodAlias: 'fried egg',
        components: [{ item: 'egg', qty: '1' }, { item: 'olive oil', qty: '1/2 tsp' }, { item: 'egg whites', qty: '2 tbsp' }],
        macros: { protein: 10, carbs: 0, fat: 7, fiber: 0, calories: 103 },
      }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.entry.foodAlias).toBe('fried egg');
    expect(body.entry.source).toBe('USER_CORRECTED');
  });

  it('returns 400 for missing foodAlias', async () => {
    const event = {
      body: JSON.stringify({ macros: { protein: 10, carbs: 0, fat: 7, fiber: 0, calories: 103 } }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });
});
