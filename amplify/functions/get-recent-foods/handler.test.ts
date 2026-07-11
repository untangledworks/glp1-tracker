import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn().mockResolvedValue({
    Items: [
      { foodAlias: 'greek yogurt', lastUsed: '2026-07-09T10:00:00Z', useCount: 12 },
      { foodAlias: 'fried egg', lastUsed: '2026-07-08T08:00:00Z', useCount: 8 },
    ]
  }) })) },
  QueryCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

describe('getRecentFoodsHandler', () => {
  it('returns foods sorted by use count', async () => {
    const event = {
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.foods).toHaveLength(2);
    expect(body.foods[0].foodAlias).toBe('greek yogurt');
  });
});
