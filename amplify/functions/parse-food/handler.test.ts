import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: JSON.stringify({ protein: 12, carbs: 4, fat: 0, fiber: 0, calories: 64 }) }]
      }))
    })
  })),
  InvokeModelCommand: vi.fn(),
}));

describe('parseFoodHandler', () => {
  it('returns macros for a food input', async () => {
    const event = {
      body: JSON.stringify({ rawInput: '1/2 cup plain greek yogurt' }),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.macros).toHaveProperty('protein');
    expect(body.macros).toHaveProperty('carbs');
    expect(body.macros).toHaveProperty('fat');
    expect(body.macros).toHaveProperty('fiber');
    expect(body.macros).toHaveProperty('calories');
  });

  it('returns 400 for missing rawInput', async () => {
    const event = {
      body: JSON.stringify({}),
      requestContext: { authorizer: { claims: { sub: 'user-123' } } },
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });
});
