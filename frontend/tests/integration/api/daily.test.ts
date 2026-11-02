import type { SupabaseClient } from '@supabase/supabase-js';
import type { DailyState } from '@/lib/daily';
import {
  claimDailyBonus,
  claimDailyLogin,
  claimDailyMission,
  getDailyState,
} from '@/lib/daily';
import { POST as claim } from '@/app/api/daily/claim/route';
import { GET as status } from '@/app/api/daily/status/route';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseMock } from '../helpers/supabase-mock';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/daily', () => ({
  getDailyState: jest.fn(),
  claimDailyLogin: jest.fn(),
  claimDailyMission: jest.fn(),
  claimDailyBonus: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);
const mockedGetDailyState = jest.mocked(getDailyState);
const mockedClaimDailyLogin = jest.mocked(claimDailyLogin);
const mockedClaimDailyMission = jest.mocked(claimDailyMission);
const mockedClaimDailyBonus = jest.mocked(claimDailyBonus);

const dailyState: DailyState = {
  login: { day: 2, claimed: false, rewards: [] },
  missions: [],
  bonus: { eligible: false, claimed: false, coins: 50, xp: 30 },
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

function claimRequest(body: unknown) {
  return new Request('http://localhost/api/daily/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/daily/status', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await status();

    expect(response.status).toBe(401);
  });

  it('returns the daily state for the current user', async () => {
    useSupabase();
    mockedGetDailyState.mockResolvedValue(dailyState);

    const response = await status();

    expect(response.status).toBe(200);
    expect(mockedGetDailyState).toHaveBeenCalledWith(
      expect.anything(),
      'test-user-id'
    );
    await expect(response.json()).resolves.toEqual(dailyState);
  });
});

describe('POST /api/daily/claim', () => {
  it('returns 401 when there is no authenticated user', async () => {
    useSupabase({ user: null });

    const response = await claim(claimRequest({ type: 'login' }));

    expect(response.status).toBe(401);
  });

  it('returns 400 for an unknown claim type', async () => {
    useSupabase();

    const response = await claim(claimRequest({ type: 'unknown' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid claim type',
    });
  });

  it('dispatches login claims', async () => {
    useSupabase();
    mockedClaimDailyLogin.mockResolvedValue({
      ok: true,
      state: dailyState,
    });

    const response = await claim(claimRequest({ type: 'login' }));

    expect(response.status).toBe(200);
    expect(mockedClaimDailyLogin).toHaveBeenCalledWith(
      expect.anything(),
      'test-user-id'
    );
    await expect(response.json()).resolves.toEqual(dailyState);
  });

  it('dispatches mission claims', async () => {
    useSupabase();
    mockedClaimDailyMission.mockResolvedValue({
      ok: true,
      state: dailyState,
    });

    const response = await claim(
      claimRequest({ type: 'mission', mission: 'quest_1' })
    );

    expect(response.status).toBe(200);
    expect(mockedClaimDailyMission).toHaveBeenCalledWith(
      expect.anything(),
      'test-user-id',
      'quest_1'
    );
  });

  it('dispatches bonus claims', async () => {
    useSupabase();
    mockedClaimDailyBonus.mockResolvedValue({
      ok: true,
      state: dailyState,
    });

    const response = await claim(claimRequest({ type: 'bonus' }));

    expect(response.status).toBe(200);
    expect(mockedClaimDailyBonus).toHaveBeenCalledWith(
      expect.anything(),
      'test-user-id'
    );
  });

  it('returns the failure status from the daily service', async () => {
    useSupabase();
    mockedClaimDailyLogin.mockResolvedValue({
      ok: false,
      error: "Today's login reward is already claimed.",
      status: 400,
    });

    const response = await claim(claimRequest({ type: 'login' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Today's login reward is already claimed.",
    });
  });
});
