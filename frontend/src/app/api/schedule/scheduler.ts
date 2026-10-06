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

export type PreferredStudyTime =
    | 'Morning'
    | 'Afternoon'
    | 'Evening'
    | 'Late Night'
    | string
    | null

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

const PHILIPPINE_OFFSET_HOURS = 8
const PHILIPPINE_OFFSET_MS =
    PHILIPPINE_OFFSET_HOURS *
    60 *
    60 *
    1000

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
 * Preferred study-time ranges.
 *
 * These are Philippine local times.
 */
function getPreferredStudyWindow(
    studyTime: PreferredStudyTime
): { start: string; end: string } | null {
    switch (
        studyTime?.trim().toLowerCase()
    ) {
        case 'morning':
            return {
                start: '07:00',
                end: '11:00',
            }

        case 'afternoon':
            return {
                start: '12:00',
                end: '17:00',
            }

        case 'evening':
            return {
                start: '17:00',
                end: '22:00',
            }

        case 'late night':
            return {
                start: '22:00',
                end: '23:59',
            }

        default:
            return null
    }
}

/*
 * Get the current Philippine local calendar values.
 *
 * We intentionally keep the calendar values separate from
 * JavaScript Date objects to avoid applying the UTC+8 offset
 * twice.
 */
function getPhilippineCalendarDate(
    date: Date = new Date()
): {
    year: number
    month: number
    day: number
    dayOfWeek: number
} {
    const philippineTime =
        new Date(
            date.getTime() +
                PHILIPPINE_OFFSET_MS
        )

    return {
        year:
            philippineTime.getUTCFullYear(),
        month:
            philippineTime.getUTCMonth(),
        day:
            philippineTime.getUTCDate(),
        dayOfWeek:
            philippineTime.getUTCDay(),
    }
}

/*
 * Convert a Philippine local date + time into the
 * corresponding UTC Date.
 *
 * Example:
 *
 * Philippine:
 * October 7, 2026 07:00
 *
 * Stored:
 * October 6, 2026 23:00 UTC
 */
function createPhilippineDateTime(
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
        ) -
            PHILIPPINE_OFFSET_MS
    )
}

/*
 * Add days to a Philippine calendar date.
 */
function addPhilippineDays(
    year: number,
    month: number,
    day: number,
    days: number
): {
    year: number
    month: number
    day: number
} {
    const date = new Date(
        Date.UTC(
            year,
            month,
            day,
            0,
            0,
            0,
            0
        )
    )

    date.setUTCDate(
        date.getUTCDate() + days
    )

    return {
        year:
            date.getUTCFullYear(),
        month:
            date.getUTCMonth(),
        day:
            date.getUTCDate(),
    }
}

/*
 * Get the weekday of a Philippine calendar date.
 */
function getPhilippineDayOfWeek(
    year: number,
    month: number,
    day: number
): number {
    return new Date(
        Date.UTC(
            year,
            month,
            day,
            0,
            0,
            0,
            0
        )
    ).getUTCDay()
}

/*
 * Check whether a candidate overlaps an existing block.
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
 * MAIN SCHEDULER
 *
 * Rules:
 *
 * 1. Earlier deadlines first.
 * 2. Same deadline -> higher priority first.
 * 3. Entire quest must fit inside availability.
 * 4. Preferred study time must be respected.
 * 5. Manual/existing blocks are respected.
 * 6. Generated quests cannot overlap.
 * 7. Scheduling uses 15-minute increments.
 * 8. Quest must finish before its deadline.
 * 9. If no valid slot exists, do not force schedule it.
 */
export function generateSchedule(
    quests: Quest[],
    availability: AvailabilityWindow[],
    existingBlocks: ExistingBlock[],
    studyTime: PreferredStudyTime
): ScheduleBlock[] {
    const SCHEDULE_INCREMENT_MINUTES = 15

    /*
     * Deadline first.
     *
     * This ensures urgent quests get available time first.
     */
    const sortedQuests =
        [...quests]
            .filter(
                (quest) =>
                    quest.deadline &&
                    quest.estimated_duration &&
                    quest.estimated_duration > 0
            )
            .sort((a, b) => {
                const deadlineA =
                    new Date(
                        a.deadline!
                    ).getTime()

                const deadlineB =
                    new Date(
                        b.deadline!
                    ).getTime()

                const deadlineDifference =
                    deadlineA - deadlineB

                if (
                    deadlineDifference !== 0
                ) {
                    return deadlineDifference
                }

                return (
                    getPriorityWeight(
                        b.priority
                    ) -
                    getPriorityWeight(
                        a.priority
                    )
                )
            })

    const scheduledBlocks: ScheduleBlock[] = []

    /*
     * Manual/existing blocks remain occupied.
     *
     * Newly generated blocks are added here as they are
     * created so later quests cannot overlap them.
     */
    const occupiedBlocks: ExistingBlock[] = [
        ...existingBlocks,
    ]

    const now = new Date()

    /*
     * Convert Morning/Afternoon/Evening/Late Night
     * into a time range.
     */
    const preferredWindow =
        getPreferredStudyWindow(
            studyTime
        )

    /*
     * Get today's Philippine calendar date.
     *
     * IMPORTANT:
     * We never use a Date object as the representation
     * of a Philippine calendar date. This prevents the
     * UTC+8 offset from being applied twice.
     */
    const today =
        getPhilippineCalendarDate(now)

    for (
        const quest of sortedQuests
    ) {
        const duration =
            quest.estimated_duration!

        const deadline =
            new Date(
                quest.deadline!
            )

        if (
            Number.isNaN(
                deadline.getTime()
            )
        ) {
            console.warn(
                `Could not schedule quest ${quest.id}: invalid deadline`,
                {
                    deadline:
                        quest.deadline,
                }
            )

            continue
        }

        let placed = false

        /*
         * Search up to 60 Philippine calendar days.
         */
        for (
            let dayOffset = 0;
            dayOffset < 60 &&
            !placed;
            dayOffset++
        ) {
            const currentDate =
                addPhilippineDays(
                    today.year,
                    today.month,
                    today.day,
                    dayOffset
                )

            const currentDayOfWeek =
                getPhilippineDayOfWeek(
                    currentDate.year,
                    currentDate.month,
                    currentDate.day
                )

            const currentDayName =
                Object.keys(
                    DAY_INDEX
                ).find(
                    (day) =>
                        DAY_INDEX[day] ===
                        currentDayOfWeek
                )

            if (!currentDayName) {
                continue
            }

            /*
             * Only availability for this weekday.
             */
            const todaysWindows =
                availability.filter(
                    (window) =>
                        window.day ===
                        currentDayName
                )

            for (
                const window of
                    todaysWindows
            ) {
                /*
                 * Intersect weekly availability with
                 * preferred study time.
                 */
                let effectiveStart =
                    window.start

                let effectiveEnd =
                    window.end

                if (
                    preferredWindow
                ) {
                    effectiveStart =
                        window.start >
                        preferredWindow.start
                            ? window.start
                            : preferredWindow.start

                    effectiveEnd =
                        window.end <
                        preferredWindow.end
                            ? window.end
                            : preferredWindow.end
                }

                /*
                 * No overlap between availability
                 * and preferred study time.
                 */
                if (
                    effectiveStart >=
                    effectiveEnd
                ) {
                    continue
                }

                /*
                 * Convert the Philippine local
                 * availability window into actual
                 * UTC instants exactly once.
                 */
                const windowStart =
                    createPhilippineDateTime(
                        currentDate.year,
                        currentDate.month,
                        currentDate.day,
                        effectiveStart
                    )

                const windowEnd =
                    createPhilippineDateTime(
                        currentDate.year,
                        currentDate.month,
                        currentDate.day,
                        effectiveEnd
                    )

                /*
                 * Do not schedule in the past.
                 *
                 * For future days, start at the beginning
                 * of the availability window.
                 */
                let candidateStart =
                    windowStart > now
                        ? windowStart
                        : new Date(now)

                /*
                 * Round to the next 15-minute increment.
                 */
                const candidateMinutes =
                    Math.ceil(
                        candidateStart.getTime() /
                            (60 * 1000) /
                            SCHEDULE_INCREMENT_MINUTES
                    ) *
                    SCHEDULE_INCREMENT_MINUTES

                candidateStart =
                    new Date(
                        candidateMinutes *
                            60 *
                            1000
                    )

                /*
                 * Search every 15 minutes inside
                 * the effective window.
                 */
                while (
                    candidateStart <
                    windowEnd
                ) {
                    const candidateEnd =
                        new Date(
                            candidateStart.getTime() +
                                duration *
                                    60 *
                                    1000
                        )

                    /*
                     * Entire quest must fit inside
                     * availability/preferred window.
                     */
                    if (
                        candidateEnd >
                        windowEnd
                    ) {
                        break
                    }

                    /*
                     * Entire quest must finish before
                     * its deadline.
                     */
                    if (
                        candidateEnd >
                        deadline
                    ) {
                        break
                    }

                    /*
                     * Do not overlap manual or generated
                     * schedule blocks.
                     */
                    if (
                        !isOverlapping(
                            candidateStart,
                            candidateEnd,
                            occupiedBlocks
                        )
                    ) {
                        const block: ScheduleBlock =
                            {
                                quest_id:
                                    quest.id,
                                starts_at:
                                    candidateStart.toISOString(),
                                ends_at:
                                    candidateEnd.toISOString(),
                                source: 'auto',
                            }

                        scheduledBlocks.push(
                            block
                        )

                        occupiedBlocks.push(
                            {
                                starts_at:
                                    block.starts_at,
                                ends_at:
                                    block.ends_at,
                                source: 'auto',
                            }
                        )

                        placed = true

                        break
                    }

                    /*
                     * Try the next 15-minute slot.
                     */
                    candidateStart =
                        new Date(
                            candidateStart.getTime() +
                                SCHEDULE_INCREMENT_MINUTES *
                                    60 *
                                    1000
                        )
                }

                if (placed) {
                    break
                }
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
                    priority:
                        quest.priority,
                    studyTime,
                }
            )
        }
    }

    return scheduledBlocks
}