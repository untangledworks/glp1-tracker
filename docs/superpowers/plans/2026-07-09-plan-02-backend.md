# Sub-Plan 2: Backend Lambdas

> Part of [GLP-1 Tracker MVP](./2026-07-09-glp1-tracker-mvp.md). Execute tasks in order. Depends on Sub-Plan 1 (tables + types must exist).

---

### Task 1: Parse Food Lambda (Bedrock Integration)

**Files:**
- Create: `amplify/functions/parse-food/handler.ts`
- Create: `amplify/functions/parse-food/handler.test.ts`

**Interfaces:**
- Consumes: `Macros` type from `src/types/index.ts`
- Produces: `parseFoodHandler(event: { body: { rawInput: string, userId: string } }) => { macros: Macros, resolvedName: string }` — called by frontend when user logs food

- [ ] **Step 1: Write the test**

`amplify/functions/parse-food/handler.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/parse-food/handler.test.ts
```
Expected: FAIL — handler module not found.

- [ ] **Step 3: Implement the handler**

`amplify/functions/parse-food/handler.ts`:
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const PROMPT_TEMPLATE = `You are a nutrition assistant. The user ate: '{INPUT}'.
Estimate protein (g), carbs (g), fat (g), fiber (g), and calories.
Return ONLY valid JSON in this exact format: {"protein": N, "carbs": N, "fat": N, "fiber": N, "calories": N}
Be reasonable with portions — if ambiguous, assume a typical single serving.`;

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { rawInput } = body;

  if (!rawInput || typeof rawInput !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'rawInput is required' }) };
  }

  const prompt = PROMPT_TEMPLATE.replace('{INPUT}', rawInput);

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const macrosText = responseBody.content[0].text;

  const macros = JSON.parse(macrosText);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ macros, resolvedName: rawInput }),
  };
}
```

- [ ] **Step 4: Install Lambda dependencies**

```bash
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npm install -D @types/aws-lambda
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run amplify/functions/parse-food/handler.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add amplify/functions/parse-food/
git commit -m "feat: add parse-food Lambda with Bedrock Claude integration"
```

---

### Task 2: Log Food Lambda

**Files:**
- Create: `amplify/functions/log-food/handler.ts`
- Create: `amplify/functions/log-food/handler.test.ts`

**Interfaces:**
- Consumes: `Macros`, `MealSlot` types; DynamoDB FoodLog + RecentFoodIndex tables
- Produces: `logFoodHandler(event: { body: { rawInput, resolvedName, macros, mealSlot?, dictionaryRef? } }) => { entry: FoodLogEntry }` — writes to FoodLog and updates RecentFoodIndex

- [ ] **Step 1: Write the test**

`amplify/functions/log-food/handler.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/log-food/handler.test.ts
```
Expected: FAIL — handler module not found.

- [ ] **Step 3: Implement the handler**

`amplify/functions/log-food/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const RECENT_FOOD_TABLE = process.env.RECENT_FOOD_TABLE || 'RecentFoodIndex';

function inferMealSlot(hour: number): string {
  if (hour < 11) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { rawInput, resolvedName, macros, mealSlot, dictionaryRef } = body;

  if (!rawInput || !macros) {
    return { statusCode: 400, body: JSON.stringify({ error: 'rawInput and macros are required' }) };
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const inferredSlot = mealSlot || inferMealSlot(now.getHours());

  const entry = {
    id: randomUUID(),
    owner: userId,
    timestamp,
    rawInput,
    resolvedName: resolvedName || rawInput,
    macros,
    mealSlot: inferredSlot,
    dictionaryRef: dictionaryRef || null,
  };

  await client.send(new PutCommand({
    TableName: FOOD_LOG_TABLE,
    Item: entry,
  }));

  await client.send(new UpdateCommand({
    TableName: RECENT_FOOD_TABLE,
    Key: { owner: userId, foodAlias: (resolvedName || rawInput).toLowerCase() },
    UpdateExpression: 'SET lastUsed = :now, useCount = if_not_exists(useCount, :zero) + :one',
    ExpressionAttributeValues: { ':now': timestamp, ':zero': 0, ':one': 1 },
  }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/log-food/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/log-food/
git commit -m "feat: add log-food Lambda with meal slot inference and recent food tracking"
```

---

### Task 3: Log Hydration Lambda

**Files:**
- Create: `amplify/functions/log-hydration/handler.ts`
- Create: `amplify/functions/log-hydration/handler.test.ts`

**Interfaces:**
- Consumes: DynamoDB HydrationLog table
- Produces: `logHydrationHandler(event: { body: { vesselType, oz } }) => { entry: HydrationLogEntry }`

- [ ] **Step 1: Write the test**

`amplify/functions/log-hydration/handler.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

const mockPut = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: mockPut })) },
  PutCommand: vi.fn(),
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/log-hydration/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/log-hydration/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { vesselType, oz } = body;

  if (!vesselType || typeof oz !== 'number') {
    return { statusCode: 400, body: JSON.stringify({ error: 'vesselType and oz are required' }) };
  }

  const entry = {
    id: randomUUID(),
    owner: userId,
    timestamp: new Date().toISOString(),
    vesselType,
    oz,
  };

  await client.send(new PutCommand({ TableName: TABLE, Item: entry }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/log-hydration/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/log-hydration/
git commit -m "feat: add log-hydration Lambda"
```

---

### Task 4: Log Symptoms Lambda

**Files:**
- Create: `amplify/functions/log-symptoms/handler.ts`
- Create: `amplify/functions/log-symptoms/handler.test.ts`

**Interfaces:**
- Consumes: DynamoDB SymptomLog table; `Symptoms` type
- Produces: `logSymptomsHandler(event: { body: { date, injectionDay, symptoms } }) => { entry: SymptomLogEntry }`

- [ ] **Step 1: Write the test**

`amplify/functions/log-symptoms/handler.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

const mockPut = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: mockPut })) },
  PutCommand: vi.fn(),
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/log-symptoms/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/log-symptoms/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SYMPTOM_LOG_TABLE || 'SymptomLog';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { date, injectionDay, symptoms } = body;

  if (!date || !symptoms) {
    return { statusCode: 400, body: JSON.stringify({ error: 'date and symptoms are required' }) };
  }

  const entry = {
    id: randomUUID(),
    owner: userId,
    date,
    injectionDay: injectionDay || false,
    symptoms,
  };

  await client.send(new PutCommand({ TableName: TABLE, Item: entry }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/log-symptoms/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/log-symptoms/
git commit -m "feat: add log-symptoms Lambda for GLP-1 symptom tracking"
```

---

### Task 5: Get Today's Nutrition Status Lambda

**Files:**
- Create: `amplify/functions/get-today/handler.ts`
- Create: `amplify/functions/get-today/handler.test.ts`

**Interfaces:**
- Consumes: FoodLog table, HydrationLog table, User table (for targets)
- Produces: `getTodayHandler(event) => { nutrition: NutritionStatus, entries: FoodLogEntry[], hydration: { totalOz: number, entries: HydrationLogEntry[] } }` — the primary data source for the Today's Nutrition view

- [ ] **Step 1: Write the test**

`amplify/functions/get-today/handler.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/get-today/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/get-today/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const HYDRATION_TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';
const USER_TABLE = process.env.USER_TABLE || 'User';

function computeColor(current: number, target: number): 'green' | 'yellow' | 'red' {
  const ratio = current / target;
  if (ratio >= 0.8) return 'green';
  if (ratio >= 0.5) return 'yellow';
  return 'red';
}

function computeLabel(current: number, target: number, nutrient: string): string {
  const ratio = current / target;
  if (ratio >= 1) return 'Excellent.';
  if (ratio >= 0.8) {
    const remaining = target - current;
    return `Almost there. ${remaining}g more gets you to target.`;
  }
  if (ratio >= 0.5) return 'A little low today.';
  return `${nutrient} needs attention today.`;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [userResult, foodResult, hydrationResult] = await Promise.all([
    client.send(new GetCommand({ TableName: USER_TABLE, Key: { owner: userId } })),
    client.send(new QueryCommand({
      TableName: FOOD_LOG_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
    client.send(new QueryCommand({
      TableName: HYDRATION_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
  ]);

  const targets = {
    protein: userResult.Item?.proteinTarget || 60,
    fiber: userResult.Item?.fiberTarget || 25,
    hydration: userResult.Item?.hydrationTarget || 64,
  };

  const entries = foodResult.Items || [];
  const totalProtein = entries.reduce((sum: number, e: any) => sum + (e.macros?.protein || 0), 0);
  const totalFiber = entries.reduce((sum: number, e: any) => sum + (e.macros?.fiber || 0), 0);

  const hydrationEntries = hydrationResult.Items || [];
  const totalOz = hydrationEntries.reduce((sum: number, e: any) => sum + (e.oz || 0), 0);

  const nutrition = {
    protein: {
      current: totalProtein,
      target: targets.protein,
      label: computeLabel(totalProtein, targets.protein, 'Protein'),
      color: computeColor(totalProtein, targets.protein),
    },
    fiber: {
      current: totalFiber,
      target: targets.fiber,
      label: computeLabel(totalFiber, targets.fiber, 'Fiber'),
      color: computeColor(totalFiber, targets.fiber),
    },
    hydration: {
      current: totalOz,
      target: targets.hydration,
      label: computeLabel(totalOz, targets.hydration, 'Hydration'),
      color: computeColor(totalOz, targets.hydration),
    },
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nutrition, entries, hydration: { totalOz, entries: hydrationEntries } }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/get-today/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/get-today/
git commit -m "feat: add get-today Lambda with qualitative nutrition status computation"
```

---

### Task 6: Update Food Dictionary Lambda

**Files:**
- Create: `amplify/functions/update-food-dictionary/handler.ts`
- Create: `amplify/functions/update-food-dictionary/handler.test.ts`

**Interfaces:**
- Consumes: FoodDictionary table; `Macros` type
- Produces: `updateFoodDictionaryHandler(event: { body: { foodAlias, components?, macros } }) => { entry: FoodDictionaryEntry }`

- [ ] **Step 1: Write the test**

`amplify/functions/update-food-dictionary/handler.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

const mockPut = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: mockPut })) },
  PutCommand: vi.fn(),
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/update-food-dictionary/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/update-food-dictionary/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.FOOD_DICTIONARY_TABLE || 'FoodDictionary';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { foodAlias, components, macros } = body;

  if (!foodAlias || !macros) {
    return { statusCode: 400, body: JSON.stringify({ error: 'foodAlias and macros are required' }) };
  }

  const entry = {
    id: randomUUID(),
    owner: userId,
    foodAlias: foodAlias.toLowerCase(),
    components: components || null,
    macros,
    source: 'USER_CORRECTED',
    updatedAt: new Date().toISOString(),
  };

  await client.send(new PutCommand({ TableName: TABLE, Item: entry }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/update-food-dictionary/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/update-food-dictionary/
git commit -m "feat: add update-food-dictionary Lambda for user corrections"
```

---

### Task 7: Get Recent Foods Lambda

**Files:**
- Create: `amplify/functions/get-recent-foods/handler.ts`
- Create: `amplify/functions/get-recent-foods/handler.test.ts`

**Interfaces:**
- Consumes: RecentFoodIndex table
- Produces: `getRecentFoodsHandler(event) => { foods: { foodAlias: string, lastUsed: string, useCount: number }[] }` — sorted by useCount descending

- [ ] **Step 1: Write the test**

`amplify/functions/get-recent-foods/handler.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/get-recent-foods/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/get-recent-foods/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.RECENT_FOOD_TABLE || 'RecentFoodIndex';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;

  const result = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: '#owner = :uid',
    ExpressionAttributeNames: { '#owner': 'owner' },
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false,
    Limit: 20,
  }));

  const foods = (result.Items || []).sort((a: any, b: any) => b.useCount - a.useCount);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foods }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/get-recent-foods/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/get-recent-foods/
git commit -m "feat: add get-recent-foods Lambda for quick-add suggestions"
```

---

### Task 8: Repeat Meal Lambda

**Files:**
- Create: `amplify/functions/repeat-meal/handler.ts`
- Create: `amplify/functions/repeat-meal/handler.test.ts`

**Interfaces:**
- Consumes: FoodLog table, RecentFoodIndex table
- Produces: `repeatMealHandler(event: { body: { mealSlot, sourceDate? } }) => { entries: FoodLogEntry[] }` — copies yesterday's (or sourceDate's) entries for the given meal slot

- [ ] **Step 1: Write the test**

`amplify/functions/repeat-meal/handler.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/repeat-meal/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/repeat-meal/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const RECENT_FOOD_TABLE = process.env.RECENT_FOOD_TABLE || 'RecentFoodIndex';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const body = JSON.parse(event.body || '{}');
  const { mealSlot, sourceDate } = body;

  if (!mealSlot) {
    return { statusCode: 400, body: JSON.stringify({ error: 'mealSlot is required' }) };
  }

  const yesterday = sourceDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dayStart = `${yesterday}T00:00:00.000Z`;
  const dayEnd = `${yesterday}T23:59:59.999Z`;

  const queryResult = await client.send(new QueryCommand({
    TableName: FOOD_LOG_TABLE,
    KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
    FilterExpression: '#slot = :slot',
    ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp', '#slot': 'mealSlot' },
    ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd, ':slot': mealSlot },
  }));

  const sourceEntries = queryResult.Items || [];
  const now = new Date();
  const newEntries = [];

  for (const entry of sourceEntries) {
    const newEntry = {
      id: randomUUID(),
      owner: userId,
      timestamp: now.toISOString(),
      rawInput: entry.rawInput,
      resolvedName: entry.resolvedName,
      macros: entry.macros,
      mealSlot: entry.mealSlot,
      dictionaryRef: entry.dictionaryRef,
    };

    await client.send(new PutCommand({ TableName: FOOD_LOG_TABLE, Item: newEntry }));

    await client.send(new UpdateCommand({
      TableName: RECENT_FOOD_TABLE,
      Key: { owner: userId, foodAlias: (entry.resolvedName || entry.rawInput).toLowerCase() },
      UpdateExpression: 'SET lastUsed = :now, useCount = if_not_exists(useCount, :zero) + :one',
      ExpressionAttributeValues: { ':now': now.toISOString(), ':zero': 0, ':one': 1 },
    }));

    newEntries.push(newEntry);
  }

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: newEntries }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/repeat-meal/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/repeat-meal/
git commit -m "feat: add repeat-meal Lambda to copy previous day's meal entries"
```

---

### Task 9: Generate Daily Narrative Lambda

**Files:**
- Create: `amplify/functions/generate-daily-narrative/handler.ts`
- Create: `amplify/functions/generate-daily-narrative/handler.test.ts`

**Interfaces:**
- Consumes: FoodLog table, HydrationLog table, User table, Bedrock
- Produces: `generateDailyNarrativeHandler(event) => { narrative: string, suggestions: string[] }` — the AI-written qualitative narrative for Today's Nutrition view

- [ ] **Step 1: Write the test**

`amplify/functions/generate-daily-narrative/handler.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/generate-daily-narrative/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/generate-daily-narrative/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const HYDRATION_TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';
const USER_TABLE = process.env.USER_TABLE || 'User';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [userResult, foodResult, hydrationResult] = await Promise.all([
    db.send(new GetCommand({ TableName: USER_TABLE, Key: { owner: userId } })),
    db.send(new QueryCommand({
      TableName: FOOD_LOG_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
    db.send(new QueryCommand({
      TableName: HYDRATION_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': dayStart, ':end': dayEnd },
    })),
  ]);

  const user = userResult.Item || {};
  const entries = foodResult.Items || [];
  const hydrationEntries = hydrationResult.Items || [];

  const totalProtein = entries.reduce((s: number, e: any) => s + (e.macros?.protein || 0), 0);
  const totalFiber = entries.reduce((s: number, e: any) => s + (e.macros?.fiber || 0), 0);
  const totalOz = hydrationEntries.reduce((s: number, e: any) => s + (e.oz || 0), 0);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const prompt = `You are a supportive nutrition assistant for someone on GLP-1 medication.
Their dietary preference: ${user.dietaryPreference || 'no restrictions'}.

Here is their nutrition status today:
- Protein: ${totalProtein}g of ${user.proteinTarget || 60}g target
- Fiber: ${totalFiber}g of ${user.fiberTarget || 25}g target
- Hydration: ${totalOz}oz of ${user.hydrationTarget || 64}oz target
- Time of day: ${timeOfDay}

Return ONLY valid JSON: {"narrative": "2-3 sentence status", "suggestions": ["food1", "food2", "food3"]}
The narrative should be warm and encouraging. If they're short on something and it's evening, include specific quick foods (under 5 min prep) in suggestions.
Never mention calories. Never shame. Respect their dietary preference.`;

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const aiResponse = JSON.parse(responseBody.content[0].text);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiResponse),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/generate-daily-narrative/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/generate-daily-narrative/
git commit -m "feat: add generate-daily-narrative Lambda (stats + Bedrock AI narrative)"
```

---

### Task 10: Generate Weekly Summary Lambda

**Files:**
- Create: `amplify/functions/generate-weekly-summary/handler.ts`
- Create: `amplify/functions/generate-weekly-summary/handler.test.ts`

**Interfaces:**
- Consumes: FoodLog, HydrationLog, SymptomLog, User, WeeklySummary tables; Bedrock
- Produces: `generateWeeklySummaryHandler(event) => { summary: WeeklySummaryEntry }` — triggered by EventBridge cron (Sunday 8pm) or on-demand via API

- [ ] **Step 1: Write the test**

`amplify/functions/generate-weekly-summary/handler.test.ts`:
```typescript
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
      .mockResolvedValueOnce({ Items: Array(14).fill({ macros: { protein: 28, fiber: 10 } }) })
      .mockResolvedValueOnce({ Items: Array(10).fill({ oz: 12 }) })
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run amplify/functions/generate-weekly-summary/handler.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement the handler**

`amplify/functions/generate-weekly-summary/handler.ts`:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const FOOD_LOG_TABLE = process.env.FOOD_LOG_TABLE || 'FoodLog';
const HYDRATION_TABLE = process.env.HYDRATION_LOG_TABLE || 'HydrationLog';
const SYMPTOM_TABLE = process.env.SYMPTOM_LOG_TABLE || 'SymptomLog';
const USER_TABLE = process.env.USER_TABLE || 'User';
const SUMMARY_TABLE = process.env.WEEKLY_SUMMARY_TABLE || 'WeeklySummary';

function getWeekRange(): { start: string; end: string; weekStart: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
    weekStart: monday.toISOString().split('T')[0],
  };
}

function findSymptomCorrelations(foodItems: any[], symptoms: any[]): string[] {
  const correlations: string[] = [];
  const injectionDays = symptoms.filter((s: any) => s.injectionDay).map((s: any) => s.date);

  if (injectionDays.length > 0) {
    const postInjectionDates = injectionDays.flatMap((d: string) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return [d, next.toISOString().split('T')[0]];
    });

    const postInjectionFoods = foodItems.filter((f: any) =>
      postInjectionDates.includes(f.timestamp?.split('T')[0])
    );
    const otherFoods = foodItems.filter((f: any) =>
      !postInjectionDates.includes(f.timestamp?.split('T')[0])
    );

    if (postInjectionFoods.length > 0 && otherFoods.length > 0) {
      const postAvgProtein = postInjectionFoods.reduce((s: number, f: any) => s + (f.macros?.protein || 0), 0) / Math.max(postInjectionDates.length, 1);
      const otherAvgProtein = otherFoods.reduce((s: number, f: any) => s + (f.macros?.protein || 0), 0) / Math.max(7 - postInjectionDates.length, 1);

      if (postAvgProtein < otherAvgProtein * 0.7) {
        correlations.push('Protein intake drops significantly on injection days and the day after.');
      }
    }
  }

  return correlations;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext?.authorizer?.claims?.sub;
  const { start, end, weekStart } = getWeekRange();

  const [userResult, foodResult, hydrationResult, symptomResult] = await Promise.all([
    db.send(new GetCommand({ TableName: USER_TABLE, Key: { owner: userId } })),
    db.send(new QueryCommand({
      TableName: FOOD_LOG_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': start, ':end': end },
    })),
    db.send(new QueryCommand({
      TableName: HYDRATION_TABLE,
      KeyConditionExpression: '#owner = :uid AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':uid': userId, ':start': start, ':end': end },
    })),
    db.send(new QueryCommand({
      TableName: SYMPTOM_TABLE,
      KeyConditionExpression: '#owner = :uid AND #d BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#owner': 'owner', '#d': 'date' },
      ExpressionAttributeValues: { ':uid': userId, ':start': weekStart, ':end': end.split('T')[0] },
    })),
  ]);

  const user = userResult.Item || {};
  const foodItems = foodResult.Items || [];
  const hydrationItems = hydrationResult.Items || [];
  const symptomItems = symptomResult.Items || [];

  const totalProtein = foodItems.reduce((s: number, e: any) => s + (e.macros?.protein || 0), 0);
  const totalFiber = foodItems.reduce((s: number, e: any) => s + (e.macros?.fiber || 0), 0);
  const totalOz = hydrationItems.reduce((s: number, e: any) => s + (e.oz || 0), 0);
  const daysWithHydration = new Set(hydrationItems.map((e: any) => e.timestamp?.split('T')[0])).size;

  const avgProtein = Math.round(totalProtein / 7);
  const avgFiber = Math.round(totalFiber / 7);
  const correlations = findSymptomCorrelations(foodItems, symptomItems);

  const computedStats = { avgProtein, avgFiber, hydrationDays: daysWithHydration, symptomCorrelations: correlations };

  const prompt = `You are a supportive nutrition coach for someone on GLP-1 medication.
Their dietary preference: ${user.dietaryPreference || 'no restrictions'}.

Here are their computed stats for the week:
- Average daily protein: ${avgProtein}g (target: ${user.proteinTarget || 60}g)
- Average daily fiber: ${avgFiber}g (target: ${user.fiberTarget || 25}g)
- Days with hydration logged: ${daysWithHydration}/7
- Injection days this week: ${symptomItems.filter((s: any) => s.injectionDay).length}

Symptom-nutrition correlations found:
${correlations.length > 0 ? correlations.join('\n') : 'No significant correlations detected.'}

Write a 3-5 sentence narrative summary. Include what they did well, one pattern worth noting (especially symptom correlations if any), and one specific actionable suggestion that fits their diet. Never mention calories. Be encouraging and specific.`;

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const narrativeText = responseBody.content[0].text;

  const summary = {
    id: randomUUID(),
    owner: userId,
    weekStart,
    narrativeText,
    computedStats,
  };

  await db.send(new PutCommand({ TableName: SUMMARY_TABLE, Item: summary }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run amplify/functions/generate-weekly-summary/handler.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add amplify/functions/generate-weekly-summary/
git commit -m "feat: add generate-weekly-summary Lambda with symptom correlation analysis"
```

---

## Sub-Plan 2 Complete

After completing these 10 tasks you have:
- Food parsing via Bedrock AI
- CRUD for food logs, hydration, and symptoms
- Personal food dictionary with user corrections
- Recent foods index for quick-add
- Repeat meal functionality
- Today's nutrition aggregation with qualitative labels
- Daily AI narrative generation
- Weekly summary with symptom-nutrition correlation analysis

All Lambda functions are unit tested with mocked AWS services.

**Next:** Proceed to [Sub-Plan 3: Frontend PWA](./2026-07-09-plan-03-frontend.md)
