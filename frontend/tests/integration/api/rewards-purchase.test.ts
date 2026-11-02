import type { SupabaseClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/rewards/purchase/route';
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

function request(itemId: string) {
  return new Request('http://localhost/api/rewards/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId }),
  });
}

describe('POST /api/rewards/purchase', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await POST(request('hat'));

    expect(response.status).toBe(401);
  });

  it('purchases an item and returns the new coin balance', async () => {
    const rpcQuery = createQueryMock({
      data: [{ new_coin_balance: 75 }],
      error: null,
    });
    const rpc = jest.fn(() => rpcQuery);
    useSupabase({ rpc });

    const response = await POST(request('hat'));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('purchase_reward_item', {
      p_item_id: 'hat',
    });
    await expect(response.json()).resolves.toEqual({ coins: 75 });
  });

  it.each([
    ['insufficient balance', 400],
    ['already owned', 409],
    ['item not found', 404],
    ['unexpected failure', 500],
  ])('maps "%s" to status %i', async (message, status) => {
    useSupabase({
      rpc: () =>
        createQueryMock({
          data: null,
          error: { message },
        }),
    });

    const response = await POST(request('hat'));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
