import type { SupabaseClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/schedule/generate/route';
import { createClient } from '@/lib/supabase/server';
import {
  createQueryMock,
  createSupabaseMock,
} from '../helpers/supabase-mock';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

const NOW = new Date('2026-01-05T00:00:00.000Z');

const availability = [
  { day: 'Monday', start: '09:00', end: '12:00' },
];

const quest = {
  id: 'quest-1',
  title: 'Study',
  deadline: '2026-01-05T04:00:00.000Z',
  priority: 'medium',
  estimated_duration: 60,
};

function useSupabase(
  options: Parameters<typeof createSupabaseMock>[0] = {}
) {
  const mock = createSupabaseMock(options);
  mockedCreateClient.mockResolvedValue(
    mock.client as unknown as SupabaseClient
  );
  return mock;
}

function profileQuery(weeklyAvailability: unknown = availability) {
  return createQueryMock({
    data: { weekly_availability: weeklyAvailability },
    error: null,
  });
}

function questsQuery(quests: unknown = [quest]) {
  return createQueryMock({ data: quests, error: null });
}

function fromQueues(queues: Record<string, ReturnType<typeof createQueryMock>[]>) {
  const calls: Record<string, number> = {};

  return jest.fn((table: string) => {
    const index = calls[table] ?? 0;
    calls[table] = index + 1;

    const queue = queues[table];

    if (!queue || !queue[index]) {
      return createQueryMock({ data: null, error: null });
    }

    return queue[index];
  });
}

describe('POST /api/schedule/generate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it('returns 400 when the profile has no availability', async () => {
    useSupabase({
      from: (table) =>
        table === 'profiles' ? profileQuery([]) : questsQuery([]),
    });

    const response = await POST();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'No weekly availability is configured.',
    });
  });

  it('returns 500 when the profile cannot be loaded', async () => {
    useSupabase({
      from: () =>
        createQueryMock({
          data: null,
          error: { message: 'profile lookup failed' },
        }),
    });

    const response = await POST();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Could not load profile availability',
    });
  });

  it('returns early when there are no pending quests', async () => {
    useSupabase({
      from: fromQueues({
        profiles: [profileQuery()],
        quests: [questsQuery([])],
      }),
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        blocks: [],
        unscheduled: [],
        scheduled_count: 0,
      })
    );
  });

  it('deletes stale auto blocks and inserts a generated plan', async () => {
    const blocksSelect = createQueryMock({ data: [], error: null });
    const blocksDelete = createQueryMock({ data: null, error: null });
    const inserted = [
      {
        id: 'block-1',
        quest_id: 'quest-1',
        starts_at: '2026-01-05T01:00:00.000Z',
        ends_at: '2026-01-05T02:00:00.000Z',
        source: 'auto',
      },
    ];
    const blocksInsert = createQueryMock({ data: inserted, error: null });

    const from = fromQueues({
      profiles: [profileQuery()],
      quests: [questsQuery()],
      schedule_blocks: [blocksSelect, blocksDelete, blocksInsert],
    });

    useSupabase({ from: from as never });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(blocksDelete.delete).toHaveBeenCalled();
    expect(blocksInsert.insert).toHaveBeenCalledWith([
      {
        user_id: 'test-user-id',
        quest_id: 'quest-1',
        starts_at: '2026-01-05T01:00:00.000Z',
        ends_at: '2026-01-05T02:00:00.000Z',
        source: 'auto',
      },
    ]);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        blocks: inserted,
        scheduled_count: 1,
        unscheduled: [],
      })
    );
  });

  it('returns unscheduled quests with a reason instead of inserting', async () => {
    const blocksSelect = createQueryMock({ data: [], error: null });
    const blocksDelete = createQueryMock({ data: null, error: null });

    const from = fromQueues({
      profiles: [profileQuery()],
      quests: [
        questsQuery([
          {
            ...quest,
            deadline: '2026-01-04T00:00:00.000Z',
          },
        ]),
      ],
      schedule_blocks: [blocksSelect, blocksDelete],
    });

    useSupabase({ from: from as never });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        blocks: [],
        scheduled_count: 0,
        unscheduled: [
          expect.objectContaining({
            quest_id: 'quest-1',
            reason: 'deadline_passed',
          }),
        ],
      })
    );
  });

  it('returns 500 when generated blocks cannot be saved', async () => {
    const blocksSelect = createQueryMock({ data: [], error: null });
    const blocksDelete = createQueryMock({ data: null, error: null });
    const blocksInsert = createQueryMock({
      data: null,
      error: { message: 'insert failed' },
    });

    const from = fromQueues({
      profiles: [profileQuery()],
      quests: [questsQuery()],
      schedule_blocks: [blocksSelect, blocksDelete, blocksInsert],
    });

    useSupabase({ from: from as never });

    const response = await POST();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Could not save generated schedule',
    });
  });
});
