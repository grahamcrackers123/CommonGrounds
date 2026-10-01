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

Supabase stores timestamps as absolute timestamps, normally
displayed as UTC.

Example:

Philippine time:
October 1, 2026 10:00 AM

Stored as UTC:
October 1, 2026 02:00 UTC

This conversion is intentional.
=========================================================
*/

const PHILIPPINE_OFFSET_HOURS = 8
const PHILIPPINE_OFFSET_MS =
    PHILIPPINE_OFFSET_HOURS * 60 * 60 * 1000

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
Get the current date/time represented in Philippine local
calendar terms.

We use UTC calculations internally so the result does not
depend on the server's own timezone.
*/
function getPhilippineNow(): Date {
    return new Date(
        Date.now() + PHILIPPINE_OFFSET_MS
    )
}

/*
Create a UTC Date from a Philippine calendar date and
Philippine local time.

Example:

date = Oct 1, 2026
time = 10:00

returns:

2026-10-01T02:00:00.000Z
*/
function createPhilippineDateTime(
    date: Date,
    time: string
): Date {
    const [hours, minutes] =
        time.split(':').map(Number)

    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()

    const utcMilliseconds = Date.UTC(
        year,
        month,
        day,
        hours,
        minutes,
        0,
        0
    )

    return new Date(
        utcMilliseconds -
            PHILIPPINE_OFFSET_MS
    )
}

/*
Return a Philippine calendar date at midnight,
represented internally as UTC.
*/
function createPhilippineDate(
    year: number,
    month: number,
    day: number
): Date {
    return new Date(
        Date.UTC(
            year,
            month,
            day,
            0,
            0,
            0,
            0
        ) - PHILIPPINE_OFFSET_MS
    )
}

/*
Get the Philippine day-of-week for a UTC timestamp.

The timestamp is converted to Philippine local calendar
terms before checking the day.
*/
function getPhilippineDayIndex(
    date: Date
): number {
    const philippineTime =
        new Date(
            date.getTime() +
                PHILIPPINE_OFFSET_MS
        )

    return philippineTime.getUTCDay()
}

/*
Get the next occurrence of a weekly availability window.

IMPORTANT:
The availability day and time are interpreted as
Philippine local time.
*/
function getNextOccurrence(
    dayName: string,
    startTime: string,
    fromDate: Date
): Date | null {
    const targetDay =
        DAY_INDEX[dayName]

    if (targetDay === undefined) {
        return null
    }

    const philippineNow =
        getPhilippineNow()

    const currentDay =
        philippineNow.getUTCDay()

    const daysUntilTarget =
    (targetDay - currentDay + 7) % 7

    /*
    Construct today's Philippine calendar date.
    */
    const candidateDate =
        createPhilippineDate(
            philippineNow.getUTCFullYear(),
            philippineNow.getUTCMonth(),
            philippineNow.getUTCDate()
        )

    candidateDate.setUTCDate(
        candidateDate.getUTCDate() +
            daysUntilTarget
    )

    const candidate =
        createPhilippineDateTime(
            candidateDate,
            startTime
        )

    /*
    If this week's occurrence has already passed,
    move to next week's occurrence.

    Compare against the actual UTC instant.
    */
    if (candidate <= fromDate) {
        candidateDate.setUTCDate(
            candidateDate.getUTCDate() +
                7
        )

        return createPhilippineDateTime(
            candidateDate,
            startTime
        )
    }

    return candidate
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

/*
Create the end of a Philippine availability window.

The date is already represented as a Philippine calendar
date encoded internally as UTC.
*/
function createWindowEnd(
    date: Date,
    time: string
): Date {
    const philippineDate =
        new Date(
            date.getTime() +
                PHILIPPINE_OFFSET_MS
        )

    return createPhilippineDateTime(
        philippineDate,
        time
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

        Every window is interpreted in Philippine time.
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
                            console.log("WINDOW TEST:", {
    day: window.day,
    startTime: window.start,
    calculatedStart: start?.toISOString(),
    now: now.toISOString(),
})

                        if (!start) {
                            return null
                        }

                        /*
                        Reconstruct the Philippine calendar
                        date corresponding to this candidate.

                        Adding the Philippine offset allows us
                        to read the UTC date as Philippine
                        calendar values.
                        */
                        const philippineCandidate =
                            new Date(
                                start.getTime() +
                                    PHILIPPINE_OFFSET_MS
                            )

                        const candidateDate =
                            createPhilippineDate(
                                philippineCandidate.getUTCFullYear(),
                                philippineCandidate.getUTCMonth(),
                                philippineCandidate.getUTCDate()
                            )

                        const windowEnd =
                            createWindowEnd(
                                candidateDate,
                                window.end
                            )

                            console.log('WINDOW DEBUG:', {
    day: window.day,
    start: window.start,
    end: window.end,
    windowStart: start.toISOString(),
    windowEnd: windowEnd.toISOString(),
})

                        return {
                            window,
                            start,
                            windowEnd,
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