import type { SupabaseClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/rooms/join/route';
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

function request(body: unknown) {
  return new Request('http://localhost/api/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/rooms/join', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await POST(request({ code: 'ABC123' }));

    expect(response.status).toBe(401);
  });

  it('returns 400 when the room code is missing', async () => {
    useSupabase();

    const response = await POST(request({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'code is required',
    });
  });

  it('joins a room and returns the room id', async () => {
    const rpc = jest.fn(() =>
      createQueryMock({ data: 'room-1', error: null })
    );
    useSupabase({ rpc });

    const response = await POST(request({ code: 'ABC123' }));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('join_room', { _code: 'ABC123' });
    await expect(response.json()).resolves.toEqual({ room_id: 'room-1' });
  });

  it.each([
    ['room not found', 404, 'Room not found'],
    ['room full', 409, 'Room is full'],
    ['unexpected failure', 500, 'unexpected failure'],
  ])('maps "%s" to status %i', async (message, status, expected) => {
    useSupabase({
      rpc: () =>
        createQueryMock({
          data: null,
          error: { message },
        }),
    });

    const response = await POST(request({ code: 'ABC123' }));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: expected });
  });
});
