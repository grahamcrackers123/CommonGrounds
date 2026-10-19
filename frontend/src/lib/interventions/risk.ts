export type BehavioralEvent = {
  type: string
  occurred_at: string
  metadata: Record<string, unknown>
}

export type RiskFlag = {
  type: string
  message: string
}

export function detectMissedSessions(
  events: BehavioralEvent[],
  now = new Date()
): RiskFlag | null {
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const missedCount = events.filter((event) => {
    if (event.type !== 'session_missed') {
      return false
    }

    const occurredAt = new Date(event.occurred_at)

    return occurredAt >= sevenDaysAgo && occurredAt <= now
  }).length

  if (missedCount >= 2) {
    return {
      type: 'missed_sessions',
      message:
        'You missed several planned study sessions this week. A short restart session could get you back on track.',
    }
  }

  return null
}

// Only real study activity should clear the inactivity flag;
// logins and reward claims are not studying.
const STUDY_EVENT_TYPES = ['session_completed', 'pet_quest']

export function detectInactivity(
  events: BehavioralEvent[],
  now = new Date()
): RiskFlag | null {
  // Users with no recorded history at all are just getting
  // started; do not flag them as inactive.
  if (events.length === 0) {
    return null
  }

  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const hasRecentStudyActivity = events.some((event) => {
    if (!STUDY_EVENT_TYPES.includes(event.type)) {
      return false
    }

    const occurredAt = new Date(event.occurred_at)

    return occurredAt >= threeDaysAgo && occurredAt <= now
  })

  if (!hasRecentStudyActivity) {
    return {
      type: 'inactivity',
      message:
        'No study activity was recorded in the last 3 days. Even a 10-minute session today counts.',
    }
  }

  return null
}

export type QuestForRisk = {
  deadline: string | null
  status: string | null
}

export function detectOverdueQuests(
  quests: QuestForRisk[],
  now = new Date()
): RiskFlag | null {
  const overdueCount = quests.filter((quest) => {
    if (!quest.deadline || quest.status === 'completed') {
      return false
    }

    return new Date(quest.deadline) < now
  }).length

  if (overdueCount >= 2) {
    return {
      type: 'overdue_quests',
      message:
        'You have coursework deadlines that have passed without completion. Consider rescheduling them.',
    }
  }

  return null
}
export type ScheduleBlockForRisk = {
  starts_at: string
  ends_at: string
}

// Availability and schedules are stored in Philippine time
// (Asia/Manila, UTC+8), so workload days must be bucketed the
// same way instead of using raw UTC dates.
const PHILIPPINE_OFFSET_MS = 8 * 60 * 60 * 1000

export function detectHighScheduledWorkload(
  blocks: ScheduleBlockForRisk[]
): RiskFlag[] {
  const dailyMinutes = new Map<string, number>()

  for (const block of blocks) {
    const start = new Date(block.starts_at)
    const end = new Date(block.ends_at)

    if (end <= start) {
      continue
    }

    const dayKey = new Date(
      start.getTime() + PHILIPPINE_OFFSET_MS
    )
      .toISOString()
      .slice(0, 10)

    const durationMinutes = (end.getTime() - start.getTime()) / 60000

    dailyMinutes.set(
      dayKey,
      (dailyMinutes.get(dayKey) ?? 0) + durationMinutes
    )
  }

  const flags: RiskFlag[] = []

  for (const [day, minutes] of dailyMinutes) {
    if (minutes > 8 * 60) {
      const readableDay = new Date(
        `${day}T00:00:00Z`
      ).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })

      flags.push({
        type: 'high_scheduled_workload',
        message: `Your schedule has more than 8 hours of planned study on ${readableDay}. Consider spreading it across the week.`,
      })
    }
  }

  return flags
}