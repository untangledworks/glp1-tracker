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

describe('logSymptomsHandler', () => {
  it('logs symptoms for today', async () => {
    const event = {
      body: JSON.stringify({
        date: '2026-07-09',
        injectionDay: true,
        symptoms: { nausea: 2, constipation: 0, diarrhea: 0, fatigue: 1, appetite: 1 },
      }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.entry.injectionDay).toBe(true);
    expect(body.entry.symptoms.nausea).toBe(2);
  });

  it('returns 400 for missing symptoms', async () => {
    const event = {
      body: JSON.stringify({ date: '2026-07-09' }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });
});
