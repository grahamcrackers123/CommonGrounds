export type Quest = {
    id: string
    deadline: string | null
    priority: string | null
    estimated_duration: number | null
}

export type AvailabilityWindow = {
    day: string
    start: string
    end: string
}

export type ExistingBlock = {
    starts_at: string
    ends_at: string
}

export type ScheduleBlock = {
    quest_id: string
    starts_at: string
    ends_at: string
    source: 'auto'
}

const PRIORITY_WEIGHT: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
}

const DAY_INDEX: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
}

function getPriorityWeight(priority: string | null): number {
    return PRIORITY_WEIGHT[priority?.toLowerCase() ?? 'medium'] ?? 2
}

function isOverlapping(
    start: Date,
    end: Date,
    existingBlocks: ExistingBlock[]
): boolean {
    return existingBlocks.some((block) => {
        const existingStart = new Date(block.starts_at)
        const existingEnd = new Date(block.ends_at)

        return start < existingEnd && end > existingStart
    })
}

function createDateWithTime(
    date: Date,
    time: string
): Date {
    const [hours, minutes] = time.split(':').map(Number)

    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)

    return result
}

function getNextOccurrence(
    dayName: string,
    startTime: string,
    fromDate: Date
): Date | null {
    const targetDay = DAY_INDEX[dayName]

    if (targetDay === undefined) {
        return null
    }

    const result = new Date(fromDate)

    result.setHours(0, 0, 0, 0)

    const daysUntilTarget =
        (targetDay - result.getDay() + 7) % 7

    result.setDate(result.getDate() + daysUntilTarget)

    const start = createDateWithTime(result, startTime)

    // If today's window has already passed, use next week's occurrence.
    if (start <= fromDate) {
        start.setDate(start.getDate() + 7)
    }

    return start
}

export function generateSchedule(
    quests: Quest[],
    availability: AvailabilityWindow[],
    existingBlocks: ExistingBlock[]
): ScheduleBlock[] {
    const sortedQuests = [...quests]
        .filter(
            (quest) =>
                quest.deadline &&
                quest.estimated_duration &&
                quest.estimated_duration > 0
        )
        .sort((a, b) => {
            const priorityDifference =
                getPriorityWeight(b.priority) -
                getPriorityWeight(a.priority)

            if (priorityDifference !== 0) {
                return priorityDifference
            }

            return (
                new Date(a.deadline!).getTime() -
                new Date(b.deadline!).getTime()
            )
        })

    const scheduledBlocks: ScheduleBlock[] = []
    const occupiedBlocks = [...existingBlocks]

    for (const quest of sortedQuests) {
        const duration = quest.estimated_duration!
        const deadline = new Date(quest.deadline!)

        let placed = false

        const candidateWindows = availability
            .map((window) => {
                const start = getNextOccurrence(
                    window.day,
                    window.start,
                    new Date()
                )

                if (!start) {
                    return null
                }

                return {
                    window,
                    start,
                }
            })
            .filter(
                (
                    candidate
                ): candidate is {
                    window: AvailabilityWindow
                    start: Date
                } => candidate !== null
            )
            .sort(
                (a, b) =>
                    a.start.getTime() -
                    b.start.getTime()
            )

        for (const candidate of candidateWindows) {
            const windowStart = candidate.start

            const windowEnd = createDateWithTime(
                windowStart,
                candidate.window.end
            )

            const blockEnd = new Date(
                windowStart.getTime() +
                    duration * 60 * 1000
            )

            if (blockEnd > windowEnd) {
                continue
            }

            if (blockEnd > deadline) {
                continue
            }

            if (
                isOverlapping(
                    windowStart,
                    blockEnd,
                    occupiedBlocks
                )
            ) {
                continue
            }

            const block: ScheduleBlock = {
                quest_id: quest.id,
                starts_at: windowStart.toISOString(),
                ends_at: blockEnd.toISOString(),
                source: 'auto',
            }

            scheduledBlocks.push(block)
            occupiedBlocks.push({
                starts_at: block.starts_at,
                ends_at: block.ends_at,
            })

            placed = true
            break
        }

        if (!placed) {
            console.warn(
                `Could not schedule quest ${quest.id} before its deadline`
            )
        }
    }

    return scheduledBlocks
}