import type { SupabaseClient } from '@supabase/supabase-js';
import { GET, POST } from '@/app/api/quests/route';
import { createClient } from '@/lib/supabase/server';
import {
  createQueryMock,
  createSupabaseMock,
} from '../helpers/supabase-mock';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

function useSupabase(
  options: Parameters<typeof createSupabaseMock>[0] = {}
) {
  const mock = createSupabaseMock(options);
  mockedCreateClient.mockResolvedValue(
    mock.client as unknown as SupabaseClient
  );
  return mock;
}

describe('GET /api/quests', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await GET(
      new Request('http://localhost/api/quests')
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Unauthorized',
    });
  });

  it('returns the current user quests and applies filters', async () => {
    const quests = [{ id: 'quest-1', title: 'Read chapter 3' }];
    const query = createQueryMock({ data: quests, error: null });
    useSupabase({ from: () => query });

    const response = await GET(
      new Request(
        'http://localhost/api/quests?status=pending&from=2026-01-01&to=2026-12-31'
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ quests });
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.order).toHaveBeenCalledWith('deadline', {
      ascending: true,
      nullsFirst: false,
    });
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
    expect(query.gte).toHaveBeenCalledWith('deadline', '2026-01-01');
    expect(query.lte).toHaveBeenCalledWith('deadline', '2026-12-31');
  });

  it('maps database errors to a 500 response', async () => {
    useSupabase({
      from: () =>
        createQueryMock({
          data: null,
          error: { message: 'database unavailable' },
        }),
    });

    const response = await GET(
      new Request('http://localhost/api/quests')
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'database unavailable',
    });
  });
});

describe('POST /api/quests', () => {
  function request(body: unknown) {
    return new Request('http://localhost/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await POST(request({ title: 'Essay' }));

    expect(response.status).toBe(401);
  });

  it('returns 400 when the title is missing', async () => {
    useSupabase();

    const response = await POST(request({ subject: 'Mathematics' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'title is required',
    });
  });

  it('creates a quest using the coursework priority and reward', async () => {
    const profileQuery = createQueryMock({
      data: { coursework_priorities: { Homework: 'high' } },
      error: null,
    });
    const insertQuery = createQueryMock({
      data: { id: 'quest-1', title: 'Essay', priority: 'high' },
      error: null,
    });
    const from = jest.fn((table: string) =>
      table === 'profiles' ? profileQuery : insertQuery
    );

    useSupabase({ from });

    const response = await POST(
      request({
        title: 'Essay',
        subject: 'Mathematics',
        coursework_type: 'Homework',
        deadline: '2026-12-01T10:00:00.000Z',
        estimated_duration: 60,
      })
    );

    expect(response.status).toBe(201);
    expect(from).toHaveBeenNthCalledWith(1, 'profiles');
    expect(from).toHaveBeenNthCalledWith(2, 'quests');
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'test-user-id',
        title: 'Essay',
        subject: 'Mathematics',
        coursework_type: 'Homework',
        priority: 'high',
        reward_coins: 50,
        status: 'pending',
      })
    );
  });

  it('retries without coursework_type when the column is missing', async () => {
    const profileQuery = createQueryMock({
      data: { coursework_priorities: { Homework: 'high' } },
      error: null,
    });
    const firstInsert = createQueryMock({
      data: null,
      error: {
        code: 'PGRST204',
        message: "Could not find the 'coursework_type' column",
      },
    });
    const secondInsert = createQueryMock({
      data: { id: 'quest-2' },
      error: null,
    });
    const insertQueries = [firstInsert, secondInsert];
    const from = jest.fn((table: string) =>
      table === 'profiles' ? profileQuery : insertQueries.shift()!
    );

    useSupabase({ from });

    const response = await POST(
      request({ title: 'Essay', coursework_type: 'Homework' })
    );

    expect(response.status).toBe(201);
    expect(firstInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ coursework_type: 'Homework' })
    );
    expect(secondInsert.insert).toHaveBeenCalledWith(
      expect.not.objectContaining({ coursework_type: expect.anything() })
    );
  });

  it('returns 500 when the insert fails', async () => {
    const profileQuery = createQueryMock({
      data: { coursework_priorities: null },
      error: null,
    });
    const insertQuery = createQueryMock({
      data: null,
      error: { message: 'insert failed' },
    });

    useSupabase({
      from: (table) =>
        table === 'profiles' ? profileQuery : insertQuery,
    });

    const response = await POST(request({ title: 'Essay' }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'insert failed',
    });
  });
});
