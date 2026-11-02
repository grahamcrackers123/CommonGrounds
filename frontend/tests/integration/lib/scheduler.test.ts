import {
  generateSchedule,
  type AvailabilityWindow,
  type Quest,
} from '@/app/api/schedule/scheduler';

const MONDAY_0800_PH = new Date('2026-01-05T00:00:00.000Z');

function availability(
  day: string,
  start: string,
  end: string
): AvailabilityWindow {
  return { day, start, end };
}

function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'quest-1',
    title: 'Study',
    deadline: '2026-01-05T04:00:00.000Z',
    priority: 'medium',
    estimated_duration: 60,
    ...overrides,
  };
}

describe('generateSchedule', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MONDAY_0800_PH);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('places a quest inside the weekly availability window', () => {
    const result = generateSchedule(
      [quest()],
      [availability('Monday', '09:00', '12:00')],
      []
    );

    expect(result.unscheduled).toEqual([]);
    expect(result.blocks).toEqual([
      {
        quest_id: 'quest-1',
        starts_at: '2026-01-05T01:00:00.000Z',
        ends_at: '2026-01-05T02:00:00.000Z',
        source: 'auto',
      },
    ]);
  });

  it('skips manual blocks that are already occupied', () => {
    const result = generateSchedule(
      [quest()],
      [availability('Monday', '09:00', '12:00')],
      [
        {
          starts_at: '2026-01-05T01:00:00.000Z',
          ends_at: '2026-01-05T01:30:00.000Z',
          source: 'manual',
        },
      ]
    );

    expect(result.blocks[0].starts_at).toBe('2026-01-05T01:30:00.000Z');
    expect(result.blocks[0].ends_at).toBe('2026-01-05T02:30:00.000Z');
  });

  it('schedules the quest with the earliest deadline first', () => {
    const later = quest({
      id: 'later',
      deadline: '2026-01-05T04:00:00.000Z',
    });
    const sooner = quest({
      id: 'sooner',
      deadline: '2026-01-05T03:00:00.000Z',
    });

    const result = generateSchedule(
      [later, sooner],
      [availability('Monday', '09:00', '12:00')],
      []
    );

    expect(result.blocks.map((block) => block.quest_id)).toEqual([
      'sooner',
      'later',
    ]);
  });

  it('uses priority as the tie-breaker for equal deadlines', () => {
    const high = quest({ id: 'high', priority: 'high' });
    const low = quest({ id: 'low', priority: 'low' });

    const result = generateSchedule(
      [low, high],
      [availability('Monday', '09:00', '12:00')],
      []
    );

    expect(result.blocks.map((block) => block.quest_id)).toEqual([
      'high',
      'low',
    ]);
  });

  it('reports every invalid or unschedulable quest', () => {
    const result = generateSchedule(
      [
        quest({ id: 'missing-deadline', deadline: null }),
        quest({ id: 'missing-duration', estimated_duration: 0 }),
        quest({
          id: 'deadline-passed',
          deadline: '2026-01-04T00:00:00.000Z',
        }),
        quest({ id: 'invalid-deadline', deadline: 'not-a-date' }),
      ],
      [availability('Monday', '09:00', '12:00')],
      []
    );

    expect(result.blocks).toEqual([]);
    expect(result.unscheduled.map((item) => item.reason)).toEqual([
      'missing_deadline',
      'missing_duration',
      'deadline_passed',
      'invalid_deadline',
    ]);
  });

  it('pins an overdue quest to its to-do day', () => {
    const result = generateSchedule(
      [
        quest({
          deadline: '2026-01-04T00:00:00.000Z',
          scheduled_date: '2026-01-06',
        }),
      ],
      [availability('Tuesday', '09:00', '12:00')],
      []
    );

    expect(result.unscheduled).toEqual([]);
    expect(result.blocks[0].starts_at).toBe('2026-01-06T01:00:00.000Z');
    expect(result.blocks[0].ends_at).toBe('2026-01-06T02:00:00.000Z');
  });

  it('reports a window that is too short for the quest', () => {
    const result = generateSchedule(
      [quest()],
      [availability('Monday', '09:00', '09:30')],
      []
    );

    expect(result.blocks).toEqual([]);
    expect(result.unscheduled[0].reason).toBe('window_too_short');
  });

  it('reports no free slot when the window is fully occupied', () => {
    const result = generateSchedule(
      [quest()],
      [availability('Monday', '09:00', '10:00')],
      [
        {
          starts_at: '2026-01-05T01:00:00.000Z',
          ends_at: '2026-01-05T02:00:00.000Z',
          source: 'manual',
        },
      ]
    );

    expect(result.blocks).toEqual([]);
    expect(result.unscheduled[0].reason).toBe('no_free_slot');
  });

  it('reports a deadline that is too soon from the current time', () => {
    jest.setSystemTime(new Date('2026-01-05T01:30:00.000Z'));

    const result = generateSchedule(
      [quest({ deadline: '2026-01-05T02:00:00.000Z' })],
      [availability('Monday', '09:00', '12:00')],
      []
    );

    expect(result.blocks).toEqual([]);
    expect(result.unscheduled[0].reason).toBe('deadline_too_soon');
  });

  it('reports no availability when no windows are configured', () => {
    const result = generateSchedule([quest()], [], []);

    expect(result.blocks).toEqual([]);
    expect(result.unscheduled[0].reason).toBe('no_availability');
  });

  it('supports availability windows that cross midnight', () => {
    jest.setSystemTime(new Date('2026-01-04T12:00:00.000Z'));

    const result = generateSchedule(
      [quest({ deadline: '2026-01-04T18:00:00.000Z' })],
      [availability('Sunday', '22:00', '01:00')],
      []
    );

    expect(result.unscheduled).toEqual([]);
    expect(result.blocks[0].starts_at).toBe('2026-01-04T14:00:00.000Z');
    expect(result.blocks[0].ends_at).toBe('2026-01-04T15:00:00.000Z');
  });
});
