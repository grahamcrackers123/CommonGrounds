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
      message: 'Several scheduled study sessions were missed recently.',
    }
  }

  return null
}

export function detectInactivity(
  events: BehavioralEvent[],
  now = new Date()
): RiskFlag | null {
  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const hasRecentActivity = events.some((event) => {
    const occurredAt = new Date(event.occurred_at)

    return occurredAt >= threeDaysAgo && occurredAt <= now
  })

  if (!hasRecentActivity) {
    return {
      type: 'inactivity',
      message: 'No recent study activity was recorded.',
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
      message: 'Several coursework deadlines have passed without completion.',
    }
  }

  return null
}
export type ScheduleBlockForRisk = {
  starts_at: string
  ends_at: string
}

export function detectHighScheduledWorkload(
  blocks: ScheduleBlockForRisk[],
  now = new Date()
): RiskFlag[] {
  const dailyMinutes = new Map<string, number>()

  for (const block of blocks) {
    const start = new Date(block.starts_at)
    const end = new Date(block.ends_at)

    if (end <= start) {
      continue
    }

    const dayKey = start.toISOString().slice(0, 10)
    const durationMinutes = (end.getTime() - start.getTime()) / 60000

    dailyMinutes.set(
      dayKey,
      (dailyMinutes.get(dayKey) ?? 0) + durationMinutes
    )
  }

  const flags: RiskFlag[] = []

  for (const [day, minutes] of dailyMinutes) {
    if (minutes > 8 * 60) {
      flags.push({
        type: 'high_scheduled_workload',
        message: `The schedule contains more than 8 hours of planned study time on ${day}.`,
      })
    }
  }

  return flags
}