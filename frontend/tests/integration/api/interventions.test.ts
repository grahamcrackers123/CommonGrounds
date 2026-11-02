import type { SupabaseClient } from '@supabase/supabase-js';
import { GET as getStatus } from '@/app/api/interventions/status/route';
import {
  GET as getPrompt,
  POST as createPromptRoute,
} from '@/app/api/interventions/prompt/route';
import { POST as respondRoute } from '@/app/api/interventions/prompt/[id]/respond/route';
import { POST as eventRoute } from '@/app/api/interventions/events/route';
import { recordBehavioralEvent } from '@/lib/interventions/events';
import { recordMissedSessions } from '@/lib/interventions/missed-sessions';
import {
  computeRiskFlags,
  evaluateAndNotifyRisk,
} from '@/lib/interventions/notify';
import {
  createPrompt,
  getActivePrompt,
  respondToPrompt,
} from '@/lib/interventions/prompts';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseMock } from '../helpers/supabase-mock';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/interventions/events', () => ({
  recordBehavioralEvent: jest.fn(),
}));

jest.mock('@/lib/interventions/missed-sessions', () => ({
  recordMissedSessions: jest.fn(),
}));

jest.mock('@/lib/interventions/notify', () => ({
  computeRiskFlags: jest.fn(),
  evaluateAndNotifyRisk: jest.fn(),
}));

jest.mock('@/lib/interventions/prompts', () => ({
  createPrompt: jest.fn(),
  getActivePrompt: jest.fn(),
  respondToPrompt: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);
const mockedRecordEvent = jest.mocked(recordBehavioralEvent);
const mockedRecordMissedSessions = jest.mocked(recordMissedSessions);
const mockedComputeRiskFlags = jest.mocked(computeRiskFlags);
const mockedEvaluateAndNotifyRisk = jest.mocked(evaluateAndNotifyRisk);
const mockedCreatePrompt = jest.mocked(createPrompt);
const mockedGetActivePrompt = jest.mocked(getActivePrompt);
const mockedRespondToPrompt = jest.mocked(respondToPrompt);

function useSupabase(
  options: Parameters<typeof createSupabaseMock>[0] = {}
) {
  const mock = createSupabaseMock(options);
  mockedCreateClient.mockResolvedValue(
    mock.client as unknown as SupabaseClient
  );
  return mock;
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/interventions/status', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await getStatus();

    expect(response.status).toBe(401);
  });

  it('returns the detected risk flags and summary', async () => {
    useSupabase();
    mockedRecordMissedSessions.mockResolvedValue({
      recorded: 2,
      error: null,
    });
    mockedComputeRiskFlags.mockResolvedValue({
      flags: [{ type: 'inactivity', message: 'No study activity.' }],
      error: null,
    });
    mockedEvaluateAndNotifyRisk.mockResolvedValue();

    const response = await getStatus();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      flags: [{ type: 'inactivity', message: 'No study activity.' }],
      summary:
        'Some workload patterns may need attention based on recent study activity and scheduling.',
    });
    expect(mockedRecordMissedSessions).toHaveBeenCalledWith(
      expect.anything(),
      'test-user-id'
    );
    expect(mockedEvaluateAndNotifyRisk).toHaveBeenCalledWith(
      expect.anything(),
      'test-user-id'
    );
  });

  it('returns a balanced summary when there are no flags', async () => {
    useSupabase();
    mockedRecordMissedSessions.mockResolvedValue({
      recorded: 0,
      error: null,
    });
    mockedComputeRiskFlags.mockResolvedValue({ flags: [], error: null });
    mockedEvaluateAndNotifyRisk.mockResolvedValue();

    const response = await getStatus();

    await expect(response.json()).resolves.toEqual({
      flags: [],
      summary: 'No workload risk indicators were detected.',
    });
  });

  it('returns 500 when risk evaluation fails', async () => {
    useSupabase();
    mockedRecordMissedSessions.mockResolvedValue({
      recorded: 0,
      error: null,
    });
    mockedComputeRiskFlags.mockResolvedValue({
      flags: [],
      error: 'events query failed',
    });

    const response = await getStatus();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'events query failed',
    });
  });
});

describe('POST /api/interventions/prompt', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await createPromptRoute(
      jsonRequest('http://localhost/api/interventions/prompt', {
        type: 'inactivity',
      })
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for an invalid JSON body', async () => {
    useSupabase();

    const response = await createPromptRoute(
      new Request('http://localhost/api/interventions/prompt', {
        method: 'POST',
        body: 'not-json',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid JSON body',
    });
  });

  it('returns 400 for an unsupported prompt type', async () => {
    useSupabase();

    const response = await createPromptRoute(
      jsonRequest('http://localhost/api/interventions/prompt', {
        type: 'not-a-prompt',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid prompt type',
    });
  });

  it('returns 201 when a new prompt is created', async () => {
    useSupabase();
    mockedCreatePrompt.mockResolvedValue({
      created: true,
      prompt: { id: 'prompt-1' },
    });

    const response = await createPromptRoute(
      jsonRequest('http://localhost/api/interventions/prompt', {
        type: 'inactivity',
        questId: 'quest-1',
        payload: { duration_minutes: 10 },
      })
    );

    expect(response.status).toBe(201);
    expect(mockedCreatePrompt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'test-user-id',
        type: 'inactivity',
        questId: 'quest-1',
        payload: { duration_minutes: 10 },
      })
    );
  });

  it('returns 200 when an existing prompt is reused', async () => {
    useSupabase();
    mockedCreatePrompt.mockResolvedValue({
      created: false,
      prompt: { id: 'prompt-1' },
    });

    const response = await createPromptRoute(
      jsonRequest('http://localhost/api/interventions/prompt', {
        type: 'inactivity',
      })
    );

    expect(response.status).toBe(200);
  });
});

describe('GET /api/interventions/prompt', () => {
  it('returns the active prompt', async () => {
    useSupabase();
    mockedGetActivePrompt.mockResolvedValue({ id: 'prompt-1' });

    const response = await getPrompt();

    await expect(response.json()).resolves.toEqual({
      prompt: { id: 'prompt-1' },
    });
  });

  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await getPrompt();

    expect(response.status).toBe(401);
  });
});

describe('POST /api/interventions/prompt/[id]/respond', () => {
  const params = { params: Promise.resolve({ id: 'prompt-1' }) };

  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await respondRoute(
      jsonRequest('http://localhost/api/interventions/prompt/prompt-1/respond', {
        action: 'accept',
      }),
      params
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for an invalid action', async () => {
    useSupabase();

    const response = await respondRoute(
      jsonRequest('http://localhost/api/interventions/prompt/prompt-1/respond', {
        action: 'ignore',
      }),
      params
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid action',
    });
  });

  it('returns 404 when the prompt is not found', async () => {
    useSupabase();
    mockedRespondToPrompt.mockRejectedValue(new Error('Prompt not found'));

    const response = await respondRoute(
      jsonRequest('http://localhost/api/interventions/prompt/prompt-1/respond', {
        action: 'dismiss',
      }),
      params
    );

    expect(response.status).toBe(404);
  });

  it('returns the updated prompt on success', async () => {
    useSupabase();
    mockedRespondToPrompt.mockResolvedValue({
      prompt: { id: 'prompt-1', status: 'dismissed' },
      recoveryEvent: null,
    });

    const response = await respondRoute(
      jsonRequest('http://localhost/api/interventions/prompt/prompt-1/respond', {
        action: 'dismiss',
      }),
      params
    );

    expect(response.status).toBe(200);
    expect(mockedRespondToPrompt).toHaveBeenCalledWith(expect.anything(), {
      promptId: 'prompt-1',
      userId: 'test-user-id',
      action: 'dismiss',
    });
  });
});

describe('POST /api/interventions/events', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await eventRoute(
      jsonRequest('http://localhost/api/interventions/events', {
        type: 'session_completed',
      })
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for an unsupported event type', async () => {
    useSupabase();

    const response = await eventRoute(
      jsonRequest('http://localhost/api/interventions/events', {
        type: 'not-an-event',
      })
    );

    expect(response.status).toBe(400);
  });

  it('records the event and evaluates risk', async () => {
    useSupabase();
    mockedRecordEvent.mockResolvedValue({
      data: { id: 'event-1' },
      error: null,
    });
    mockedEvaluateAndNotifyRisk.mockResolvedValue();

    const response = await eventRoute(
      jsonRequest('http://localhost/api/interventions/events', {
        type: 'session_completed',
        metadata: { duration_min: 25 },
      })
    );

    expect(response.status).toBe(201);
    expect(mockedRecordEvent).toHaveBeenCalledWith(
      'test-user-id',
      'session_completed',
      { duration_min: 25 }
    );
    expect(mockedEvaluateAndNotifyRisk).toHaveBeenCalled();
  });

  it('returns 500 when the event cannot be recorded', async () => {
    useSupabase();
    mockedRecordEvent.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' } as never,
    });
    mockedEvaluateAndNotifyRisk.mockResolvedValue();

    const response = await eventRoute(
      jsonRequest('http://localhost/api/interventions/events', {
        type: 'session_completed',
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'insert failed',
    });
  });
});
