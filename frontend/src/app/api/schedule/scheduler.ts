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

/*
Generated blocks are aligned to 15-minute marks inside the
availability windows.
*/
const SLOT_STEP_MS = 15 * 60 * 1000

/*
How many weeks ahead regeneration may look for free space.
The bound exists only so a malformed deadline can never
cause an endless loop.
*/
const MAX_WEEKS_AHEAD = 52

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
Get the occurrence of a weekly availability window in the
Philippine week that contains referenceDate, offset by
weekOffset weeks.

The occurrence start may lie in the past relative to
referenceDate (for example, a window that began earlier
today); callers decide whether the remaining time is still
usable.
*/
function getWeekOccurrence(
    dayName: string,
    startTime: string,
    referenceDate: Date,
    weekOffset: number
): Date | null {
    const targetDay = DAY_INDEX[dayName]

    if (targetDay === undefined) {
        return null
    }

    const reference = getPhilippineDateParts(referenceDate)

    const daysUntilTarget =
        (targetDay - reference.dayIndex + 7) % 7 +
        weekOffset * 7

    return philippineDateTimeToUtc(
        reference.year,
        reference.month,
        reference.day + daysUntilTarget,
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

        const durationMs =
            duration * 60 * 1000

        const deadline =
            new Date(
                quest.deadline!
            )

        if (
            Number.isNaN(
                deadline.getTime()
            )
        ) {
            continue
        }

        let placed = false

        /*
        Build candidate availability windows.

        Weeks from the current one up to the quest's deadline
        are considered, so quests roll into later weeks when
        this week's sessions are already full. A window that
        has already begun is still included; only its
        remaining time is used.
        */
        const candidates: Array<{
            start: Date
            windowEnd: Date
        }> = []

        for (
            const window of availability
        ) {
            for (
                let week = 0;
                week < MAX_WEEKS_AHEAD;
                week++
            ) {
                const start =
                    getWeekOccurrence(
                        window.day,
                        window.start,
                        now,
                        week
                    )

                if (!start) {
                    break
                }

                /*
                Later occurrences only start later, so once
                one cannot finish before the deadline the
                rest cannot either.
                */
                if (
                    start.getTime() +
                    durationMs >
                    deadline.getTime()
                ) {
                    break
                }

                const windowEnd =
                    getWindowEnd(
                        start,
                        window.start,
                        window.end
                    )

                if (windowEnd <= now) {
                    continue
                }

                candidates.push({
                    start,
                    windowEnd,
                })
            }
        }

        candidates.sort(
            (a, b) =>
                a.start.getTime() -
                b.start.getTime()
        )

        /*
        Scan each candidate window in 15-minute steps and
        pack quest blocks back-to-back as long as they fit
        inside the window and before the deadline.
        */
        for (
            const candidate of candidates
        ) {
            let slotStart =
                new Date(
                    Math.max(
                        candidate.start.getTime(),
                        now.getTime()
                    )
                )

            slotStart = new Date(
                Math.ceil(
                    slotStart.getTime() /
                    SLOT_STEP_MS
                ) * SLOT_STEP_MS
            )

            for (;;) {
                const blockEnd =
                    new Date(
                        slotStart.getTime() +
                        durationMs
                    )

                /*
                The quest must fit completely inside
                the availability window.
                */
                if (
                    blockEnd >
                    candidate.windowEnd
                ) {
                    break
                }

                /*
                The entire quest must finish before its
                deadline. Starting later makes this worse,
                so the whole window can be skipped.
                */
                if (blockEnd > deadline) {
                    break
                }

                /*
                Do not overlap another existing/manual
                schedule block.
                */
                if (
                    !isOverlapping(
                        slotStart,
                        blockEnd,
                        occupiedBlocks
                    )
                ) {
                    const block:
                        ScheduleBlock = {
                        quest_id:
                            quest.id,
                        starts_at:
                            slotStart.toISOString(),
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

                slotStart = new Date(
                    slotStart.getTime() +
                    SLOT_STEP_MS
                )
            }

            if (placed) {
                break
            }
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
