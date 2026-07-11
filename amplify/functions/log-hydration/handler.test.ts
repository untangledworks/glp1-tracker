import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

const mockPut = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn((cmd: any) => {
        if (cmd.constructor.name === 'PutCommand') return mockPut();
      })
    }))
  },
  PutCommand: vi.fn().mockImplementation((params) => ({ constructor: { name: 'PutCommand' }, ...params })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

describe('logHydrationHandler', () => {
  it('logs a hydration entry', async () => {
    const event = {
      body: JSON.stringify({ vesselType: 'glass', oz: 12 }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.entry.vesselType).toBe('glass');
    expect(body.entry.oz).toBe(12);
  });

  it('returns 400 for missing oz', async () => {
    const event = {
      body: JSON.stringify({ vesselType: 'glass' }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });
});
