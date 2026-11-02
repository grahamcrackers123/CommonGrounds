import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createPrompt,
  getActivePrompt,
  respondToPrompt,
} from '@/lib/interventions/prompts';
import {
  createQueryMock,
  createSupabaseMock,
} from '../helpers/supabase-mock';

function clientWithQueries(
  ...queries: ReturnType<typeof createQueryMock>[]
): SupabaseClient {
  return createSupabaseMock({
    from: jest
      .fn()
      .mockReturnValueOnce(queries[0])
      .mockReturnValueOnce(queries[1])
      .mockReturnValueOnce(queries[2]) as never,
  }).client;
}

describe('createPrompt', () => {
  it('reuses an existing pending prompt', async () => {
    const existing = { id: 'prompt-1', status: 'pending', snooze_until: null };
    const query = createQueryMock({ data: existing, error: null });
    const supabase = clientWithQueries(query);

    const result = await createPrompt(supabase, {
      userId: 'user-1',
      type: 'inactivity',
    });

    expect(result).toEqual({ created: false, prompt: existing });
    expect(query.insert).not.toHaveBeenCalled();
  });

  it('keeps an existing postponed prompt while it is still snoozed', async () => {
    const existing = {
      id: 'prompt-1',
      status: 'postponed',
      snooze_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    const query = createQueryMock({ data: existing, error: null });
    const supabase = clientWithQueries(query);

    const result = await createPrompt(supabase, {
      userId: 'user-1',
      type: 'inactivity',
    });

    expect(result).toEqual({ created: false, prompt: existing });
    expect(query.update).not.toHaveBeenCalled();
  });

  it('revives a postponed prompt once its snooze has expired', async () => {
    const existing = {
      id: 'prompt-1',
      status: 'postponed',
      snooze_until: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    };
    const revived = { ...existing, status: 'pending', snooze_until: null };
    const readQuery = createQueryMock({ data: existing, error: null });
    const updateQuery = createQueryMock({ data: revived, error: null });
    const supabase = clientWithQueries(readQuery, updateQuery);

    const result = await createPrompt(supabase, {
      userId: 'user-1',
      type: 'inactivity',
    });

    expect(result).toEqual({ created: false, prompt: revived });
    expect(updateQuery.update).toHaveBeenCalledWith({
      status: 'pending',
      snooze_until: null,
    });
  });

  it('does not recreate a prompt type still in its cooldown window', async () => {
    const readQuery = createQueryMock({ data: null, error: null });
    const recentQuery = createQueryMock({
      data: [{ id: 'recent' }],
      error: null,
    });
    const from = jest.fn()
      .mockReturnValueOnce(readQuery)
      .mockReturnValueOnce(recentQuery);
    const client = createSupabaseMock({ from: from as never }).client;

    const result = await createPrompt(client, {
      userId: 'user-1',
      type: 'inactivity',
    });

    expect(result).toEqual({ created: false, prompt: null });
    expect(from).toHaveBeenCalledTimes(2);
    expect(recentQuery.insert).not.toHaveBeenCalled();
  });

  it('inserts and returns a new prompt', async () => {
    const inserted = { id: 'prompt-2', status: 'pending' };
    const readQuery = createQueryMock({ data: null, error: null });
    const recentQuery = createQueryMock({ data: [], error: null });
    const insertQuery = createQueryMock({ data: inserted, error: null });
    const supabase = clientWithQueries(readQuery, recentQuery, insertQuery);

    const result = await createPrompt(supabase, {
      userId: 'user-1',
      type: 'schedule_extension',
      questId: 'quest-1',
      payload: { reason: 'overdue' },
    });

    expect(result).toEqual({ created: true, prompt: inserted });
    expect(insertQuery.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'schedule_extension',
      quest_id: 'quest-1',
      payload: { reason: 'overdue' },
    });
  });
});

describe('getActivePrompt', () => {
  it('returns null when there is no prompt', async () => {
    const query = createQueryMock({ data: null, error: null });
    const supabase = clientWithQueries(query);

    await expect(getActivePrompt(supabase, 'user-1')).resolves.toBeNull();
  });

  it('returns a pending prompt directly', async () => {
    const pending = { id: 'prompt-1', status: 'pending', snooze_until: null };
    const query = createQueryMock({ data: pending, error: null });
    const supabase = clientWithQueries(query);

    await expect(getActivePrompt(supabase, 'user-1')).resolves.toEqual(
      pending
    );
  });

  it('revives an expired postponed prompt', async () => {
    const postponed = {
      id: 'prompt-1',
      status: 'postponed',
      snooze_until: new Date(Date.now() - 60 * 1000).toISOString(),
    };
    const revived = { ...postponed, status: 'pending', snooze_until: null };
    const readQuery = createQueryMock({ data: postponed, error: null });
    const updateQuery = createQueryMock({ data: revived, error: null });
    const supabase = clientWithQueries(readQuery, updateQuery);

    await expect(getActivePrompt(supabase, 'user-1')).resolves.toEqual(
      revived
    );
    expect(updateQuery.update).toHaveBeenCalledWith({
      status: 'pending',
      snooze_until: null,
    });
  });

  it('hides a prompt that is still snoozed', async () => {
    const postponed = {
      id: 'prompt-1',
      status: 'postponed',
      snooze_until: new Date(Date.now() + 60 * 1000).toISOString(),
    };
    const query = createQueryMock({ data: postponed, error: null });
    const supabase = clientWithQueries(query);

    await expect(getActivePrompt(supabase, 'user-1')).resolves.toBeNull();
  });
});

describe('respondToPrompt', () => {
  function prompt(type = 'restart_10min') {
    return {
      id: 'prompt-1',
      type,
      quest_id: 'quest-1',
      status: 'pending',
    };
  }

  it('accepts a restart prompt and creates a recovery event', async () => {
    const readQuery = createQueryMock({ data: prompt(), error: null });
    const updateQuery = createQueryMock({
      data: { ...prompt(), status: 'accepted' },
      error: null,
    });
    const recoveryQuery = createQueryMock({
      data: { id: 'recovery-1', action_type: 'restart_10min' },
      error: null,
    });
    const supabase = clientWithQueries(
      readQuery,
      updateQuery,
      recoveryQuery
    );

    const result = await respondToPrompt(supabase, {
      promptId: 'prompt-1',
      userId: 'user-1',
      action: 'accept',
    });

    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' })
    );
    expect(recoveryQuery.insert).toHaveBeenCalledWith({
      prompt_id: 'prompt-1',
      user_id: 'user-1',
      quest_id: 'quest-1',
      action_type: 'restart_10min',
    });
    expect(result.recoveryEvent).toEqual({
      id: 'recovery-1',
      action_type: 'restart_10min',
    });
  });

  it('accepts a non-restart prompt without creating a recovery event', async () => {
    const readQuery = createQueryMock({
      data: prompt('schedule_extension'),
      error: null,
    });
    const updateQuery = createQueryMock({
      data: { ...prompt('schedule_extension'), status: 'accepted' },
      error: null,
    });
    const from = jest.fn()
      .mockReturnValueOnce(readQuery)
      .mockReturnValueOnce(updateQuery);
    const client = createSupabaseMock({ from: from as never }).client;

    const result = await respondToPrompt(client, {
      promptId: 'prompt-1',
      userId: 'user-1',
      action: 'accept',
    });

    expect(from).toHaveBeenCalledTimes(2);
    expect(result.recoveryEvent).toBeNull();
  });

  it('postpones a prompt for one hour', async () => {
    const readQuery = createQueryMock({ data: prompt(), error: null });
    const updateQuery = createQueryMock({
      data: { ...prompt(), status: 'postponed' },
      error: null,
    });
    const supabase = clientWithQueries(readQuery, updateQuery);

    await respondToPrompt(supabase, {
      promptId: 'prompt-1',
      userId: 'user-1',
      action: 'postpone',
    });

    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'postponed',
        snooze_until: expect.any(String),
        responded_at: expect.any(String),
      })
    );
  });

  it('dismisses a prompt', async () => {
    const readQuery = createQueryMock({ data: prompt(), error: null });
    const updateQuery = createQueryMock({
      data: { ...prompt(), status: 'dismissed' },
      error: null,
    });
    const supabase = clientWithQueries(readQuery, updateQuery);

    await respondToPrompt(supabase, {
      promptId: 'prompt-1',
      userId: 'user-1',
      action: 'dismiss',
    });

    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dismissed' })
    );
  });

  it('throws when the prompt does not belong to the user', async () => {
    const readQuery = createQueryMock({
      data: null,
      error: { message: 'not found' },
    });
    const supabase = clientWithQueries(readQuery);

    await expect(
      respondToPrompt(supabase, {
        promptId: 'prompt-1',
        userId: 'user-1',
        action: 'dismiss',
      })
    ).rejects.toThrow('Prompt not found');
  });
});
