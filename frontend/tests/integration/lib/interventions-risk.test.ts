import {
  detectHighScheduledWorkload,
  detectInactivity,
  detectMissedSessions,
  detectOverdueQuests,
  type BehavioralEvent,
  type QuestForRisk,
} from '@/lib/interventions/risk';

const NOW = new Date('2026-01-10T12:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function event(
  type: string,
  occurredAt: string
): BehavioralEvent {
  return { type, occurred_at: occurredAt, metadata: {} };
}

describe('detectInactivity', () => {
  it('does not flag a user with no history', () => {
    expect(detectInactivity([], NOW)).toBeNull();
  });

  it('flags a user with history but no recent study activity', () => {
    const flag = detectInactivity(
      [event('session_completed', daysAgo(4))],
      NOW
    );

    expect(flag?.type).toBe('inactivity');
  });

  it('does not flag recent completed study sessions', () => {
    expect(
      detectInactivity([event('session_completed', daysAgo(2))], NOW)
    ).toBeNull();
  });

  it('treats completed quests as study activity', () => {
    expect(
      detectInactivity([event('pet_quest', daysAgo(2))], NOW)
    ).toBeNull();
  });

  it('does not treat logins or rewards as study activity', () => {
    const flag = detectInactivity(
      [
        event('daily_login', daysAgo(0)),
        event('session_completed', daysAgo(4)),
      ],
      NOW
    );

    expect(flag?.type).toBe('inactivity');
  });
});

describe('detectMissedSessions', () => {
  it('flags two missed sessions inside the last week', () => {
    const flag = detectMissedSessions(
      [
        event('session_missed', daysAgo(1)),
        event('session_missed', daysAgo(3)),
      ],
      NOW
    );

    expect(flag?.type).toBe('missed_sessions');
  });

  it('does not flag a single missed session', () => {
    expect(
      detectMissedSessions([event('session_missed', daysAgo(1))], NOW)
    ).toBeNull();
  });

  it('ignores missed sessions older than a week', () => {
    expect(
      detectMissedSessions(
        [
          event('session_missed', daysAgo(8)),
          event('session_missed', daysAgo(9)),
        ],
        NOW
      )
    ).toBeNull();
  });
});

describe('detectOverdueQuests', () => {
  it('flags two overdue incomplete quests', () => {
    const quests: QuestForRisk[] = [
      { deadline: daysAgo(1), status: 'pending' },
      { deadline: daysAgo(2), status: 'in_progress' },
    ];

    expect(detectOverdueQuests(quests, NOW)?.type).toBe('overdue_quests');
  });

  it('ignores completed quests and quests without deadlines', () => {
    const quests: QuestForRisk[] = [
      { deadline: daysAgo(1), status: 'completed' },
      { deadline: null, status: 'pending' },
    ];

    expect(detectOverdueQuests(quests, NOW)).toBeNull();
  });

  it('ignores future deadlines', () => {
    const quests: QuestForRisk[] = [
      { deadline: daysAgo(-2), status: 'pending' },
      { deadline: daysAgo(-3), status: 'pending' },
    ];

    expect(detectOverdueQuests(quests, NOW)).toBeNull();
  });
});

describe('detectHighScheduledWorkload', () => {
  it('flags more than eight hours on a Philippine calendar day', () => {
    const flags = detectHighScheduledWorkload([
      {
        starts_at: '2026-01-05T00:00:00.000Z',
        ends_at: '2026-01-05T04:00:00.000Z',
      },
      {
        starts_at: '2026-01-05T05:00:00.000Z',
        ends_at: '2026-01-05T10:00:00.000Z',
      },
    ]);

    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe('high_scheduled_workload');
    expect(flags[0].message).toContain('Monday, Jan 5');
  });

  it('does not flag exactly eight hours', () => {
    expect(
      detectHighScheduledWorkload([
        {
          starts_at: '2026-01-05T00:00:00.000Z',
          ends_at: '2026-01-05T08:00:00.000Z',
        },
      ])
    ).toEqual([]);
  });

  it('buckets late UTC blocks into the next Philippine day', () => {
    const flags = detectHighScheduledWorkload([
      {
        starts_at: '2026-01-05T16:00:00.000Z',
        ends_at: '2026-01-06T02:00:00.000Z',
      },
    ]);

    expect(flags).toHaveLength(1);
    expect(flags[0].message).toContain('Tuesday, Jan 6');
  });

  it('ignores malformed blocks whose end is not after the start', () => {
    expect(
      detectHighScheduledWorkload([
        {
          starts_at: '2026-01-05T04:00:00.000Z',
          ends_at: '2026-01-05T02:00:00.000Z',
        },
      ])
    ).toEqual([]);
  });
});
