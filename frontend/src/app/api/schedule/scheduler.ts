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
    source?: string
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

/*
=========================================================
TIMEZONE
=========================================================

All weekly availability entered by the user is treated as
Philippine time (Asia/Manila / UTC+8).

Supabase stores timestamps as absolute instants (UTC), so
every helper below converts between a real UTC instant and
Philippine calendar fields (year, month, day, day-of-week).
========================================================
*/

const PHILIPPINE_OFFSET_HOURS = 8
const PHILIPPINE_OFFSET_MS =
    PHILIPPINE_OFFSET_HOURS * 60 * 60 * 1000

type PhilippineDateParts = {
    year: number
    month: number
    day: number
    dayIndex: number
}

function getPriorityWeight(
    priority: string | null
): number {
    return (
        PRIORITY_WEIGHT[
            priority?.toLowerCase() ?? 'medium'
        ] ?? 2
    )
}

/*
Read the Philippine calendar fields of a real UTC instant.
*/
function getPhilippineDateParts(
    date: Date
): PhilippineDateParts {
    const shifted = new Date(
        date.getTime() + PHILIPPINE_OFFSET_MS
    )

    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
        dayIndex: shifted.getUTCDay(),
    }
}

/*
Convert Philippine calendar fields plus an HH:MM time
into a real UTC instant.

Date.UTC normalizes overflow, so a day value past the end
of the month rolls into the next month or year correctly.
*/
function philippineDateTimeToUtc(
    year: number,
    month: number,
    day: number,
    time: string
): Date {
    const [hours, minutes] =
        time.split(':').map(Number)

    return new Date(
        Date.UTC(
            year,
            month,
            day,
            hours,
            minutes,
            0,
            0
        ) - PHILIPPINE_OFFSET_MS
    )
}

/*
Get the next UTC instant matching a weekly availability
window that starts after fromDate.

Example: fromDate is Wednesday 10:00 Philippine time and
the window is Thursday 19:00, so the result is Thursday of
the same week at 19:00 Philippine time.
*/
function getNextOccurrence(
    dayName: string,
    startTime: string,
    fromDate: Date
): Date | null {
    const targetDay = DAY_INDEX[dayName]

    if (targetDay === undefined) {
        return null
    }

    const now = getPhilippineDateParts(fromDate)

    const daysUntilTarget =
        (targetDay - now.dayIndex + 7) % 7

    const candidate = philippineDateTimeToUtc(
        now.year,
        now.month,
        now.day + daysUntilTarget,
        startTime
    )

    if (candidate > fromDate) {
        return candidate
    }

    return philippineDateTimeToUtc(
        now.year,
        now.month,
        now.day + daysUntilTarget + 7,
        startTime
    )
}

/*
Get the UTC instant at which the availability window that
starts at windowStart ends.

A window whose end time is not after its start time (for
example 22:00 to 01:00) is treated as an overnight window
that ends on the following day.
*/
function getWindowEnd(
    windowStart: Date,
    startTime: string,
    endTime: string
): Date {
    const parts =
        getPhilippineDateParts(windowStart)

    const start = philippineDateTimeToUtc(
        parts.year,
        parts.month,
        parts.day,
        startTime
    )

    const end = philippineDateTimeToUtc(
        parts.year,
        parts.month,
        parts.day,
        endTime
    )

    if (end > start) {
        return end
    }

    return philippineDateTimeToUtc(
        parts.year,
        parts.month,
        parts.day + 1,
        endTime
    )
}

/*
Check whether a generated block overlaps an existing block.
*/
function isOverlapping(
    start: Date,
    end: Date,
    existingBlocks: ExistingBlock[]
): boolean {
    return existingBlocks.some(
        (block) => {
            const existingStart =
                new Date(
                    block.starts_at
                )

            const existingEnd =
                new Date(
                    block.ends_at
                )

            return (
                start < existingEnd &&
                end > existingStart
            )
        }
    )
}

export function generateSchedule(
    quests: Quest[],
    availability: AvailabilityWindow[],
    existingBlocks: ExistingBlock[]
): ScheduleBlock[] {
    const sortedQuests =
        [...quests]
            .filter(
                (quest) =>
                    quest.deadline &&
                    quest.estimated_duration &&
                    quest.estimated_duration >
                        0
            )
            .sort(
                (a, b) => {
                    const priorityDifference =
                        getPriorityWeight(
                            b.priority
                        ) -
                        getPriorityWeight(
                            a.priority
                        )

                    if (
                        priorityDifference !==
                        0
                    ) {
                        return priorityDifference
                    }

                    return (
                        new Date(
                            a.deadline!
                        ).getTime() -
                        new Date(
                            b.deadline!
                        ).getTime()
                    )
                }
            )

    const scheduledBlocks:
        ScheduleBlock[] = []

    /*
    Existing manual blocks remain occupied.

    Automatically generated blocks are handled separately
    by the API route and are removed before regeneration.
    */
    const occupiedBlocks = [
        ...existingBlocks,
    ]

    const now = new Date()

    for (
        const quest of sortedQuests
    ) {
        const duration =
            quest.estimated_duration!

        const deadline =
            new Date(
                quest.deadline!
            )

        let placed = false

        /*
        Build candidate availability windows.

        Every window is interpreted in Philippine time and
        lands on the actual day selected by the user.
        */
        const candidateWindows =
            availability
                .map(
                    (window) => {
                        const start =
                            getNextOccurrence(
                                window.day,
                                window.start,
                                now
                            )

                        if (!start) {
                            return null
                        }

                        return {
                            window,
                            start,
                            windowEnd:
                                getWindowEnd(
                                    start,
                                    window.start,
                                    window.end
                                ),
                        }
                    }
                )
                .filter(
                    (
                        candidate
                    ): candidate is {
                        window: AvailabilityWindow
                        start: Date
                        windowEnd: Date
                    } =>
                        candidate !== null
                )
                .sort(
                    (a, b) =>
                        a.start.getTime() -
                        b.start.getTime()
                )

        for (
            const candidate of
                candidateWindows
        ) {
            const windowStart =
                candidate.start

            const windowEnd =
                candidate.windowEnd

            const blockEnd =
                new Date(
                    windowStart.getTime() +
                        duration *
                            60 *
                            1000
                )

            /*
            The quest must fit completely inside
            the availability window.
            */
            if (
                blockEnd >
                windowEnd
            ) {
                continue
            }

            /*
            The entire quest must finish before
            its deadline.
            */
            if (
                blockEnd >
                deadline
            ) {
                continue
            }

            /*
            Do not overlap another existing/manual
            schedule block.
            */
            if (
                isOverlapping(
                    windowStart,
                    blockEnd,
                    occupiedBlocks
                )
            ) {
                continue
            }

            const block:
                ScheduleBlock = {
                    quest_id:
                        quest.id,
                    starts_at:
                        windowStart.toISOString(),
                    ends_at:
                        blockEnd.toISOString(),
                    source: 'auto',
                }

            scheduledBlocks.push(
                block
            )

            occupiedBlocks.push({
                starts_at:
                    block.starts_at,
                ends_at:
                    block.ends_at,
            })

            placed = true
            break
        }

        if (!placed) {
            console.warn(
                `Could not schedule quest ${quest.id} before its deadline`,
                {
                    deadline:
                        quest.deadline,
                    estimated_duration:
                        quest.estimated_duration,
                }
            )
        }
    }

    return scheduledBlocks
}
