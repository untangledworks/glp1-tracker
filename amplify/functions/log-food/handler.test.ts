import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

const mockPut = vi.fn().mockResolvedValue({});
const mockUpdate = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: (cmd: any) => {
    if (cmd.constructor.name === 'PutCommand') return mockPut();
    if (cmd.constructor.name === 'UpdateCommand') return mockUpdate();
  }})) },
  PutCommand: vi.fn().mockImplementation((params) => ({ constructor: { name: 'PutCommand' }, ...params })),
  UpdateCommand: vi.fn().mockImplementation((params) => ({ constructor: { name: 'UpdateCommand' }, ...params })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

describe('logFoodHandler', () => {
  it('logs a food entry and returns it', async () => {
    const event = {
      body: JSON.stringify({
        rawInput: 'greek yogurt',
        resolvedName: 'greek yogurt',
        macros: { protein: 12, carbs: 4, fat: 0, fiber: 0, calories: 64 },
      }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.entry.rawInput).toBe('greek yogurt');
    expect(body.entry.macros.protein).toBe(12);
    expect(body.entry.mealSlot).toBeDefined();
  });

  it('returns 400 for missing macros', async () => {
    const event = {
      body: JSON.stringify({ rawInput: 'yogurt' }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });
});
