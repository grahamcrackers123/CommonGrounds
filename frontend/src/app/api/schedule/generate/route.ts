import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import {
    generateSchedule,
    type AvailabilityWindow,
    type ExistingBlock,
    type Quest,
} from '../scheduler'

export async function POST() {
    const startTime = Date.now()

    const supabase =
        await createClient()

    /*
    =====================================================
    1. AUTHENTICATION
    =====================================================
    */

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json(
            {
                error:
                    'Unauthorized',
            },
            {
                status: 401,
            }
        )
    }

    /*
    =====================================================
    2. LOAD WEEKLY AVAILABILITY
    =====================================================
    */

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(
            'weekly_availability'
        )
        .eq(
            'id',
            user.id
        )
        .single()

    if (
        profileError ||
        !profile
    ) {
        console.error(
            'Schedule profile error:',
            profileError
        )

        return NextResponse.json(
            {
                error:
                    'Could not load profile availability',
            },
            {
                status: 500,
            }
        )
    }

    const availability =
        Array.isArray(
            profile.weekly_availability
        )
            ? (
                  profile.weekly_availability as AvailabilityWindow[]
              )
            : []

    if (
        availability.length === 0
    ) {
        return NextResponse.json(
            {
                error:
                    'No weekly availability is configured.',
            },
            {
                status: 400,
            }
        )
    }

    console.log(
        'Schedule availability:',
        availability
    )

    /*
    =====================================================
    3. LOAD PENDING QUESTS
    =====================================================
    */

    const {
        data: quests,
        error: questsError,
    } = await supabase
        .from('quests')
        .select(
            'id, deadline, priority, estimated_duration'
        )
        .eq(
            'user_id',
            user.id
        )
        .eq(
            'status',
            'pending'
        )
        .not(
            'deadline',
            'is',
            null
        )
        .not(
            'estimated_duration',
            'is',
            null
        )

    if (questsError) {
        console.error(
            'Schedule quest error:',
            questsError
        )

        return NextResponse.json(
            {
                error:
                    'Could not load quests',
            },
            {
                status: 500,
            }
        )
    }

    const validQuests =
        (quests ?? []) as Quest[]

    console.log(
        'Pending quests for scheduler:',
        validQuests
    )

    if (
        validQuests.length === 0
    ) {
        return NextResponse.json({
            message:
                'No pending quests need scheduling.',
            blocks: [],
            scheduled_count: 0,
            duration_ms:
                Date.now() -
                startTime,
        })
    }

    /*
    =====================================================
    4. LOAD EXISTING SCHEDULE BLOCKS
    =====================================================
    */

    const {
        data: existingBlocks,
        error: blocksError,
    } = await supabase
        .from('schedule_blocks')
        .select(
            'starts_at, ends_at, source'
        )
        .eq(
            'user_id',
            user.id
        )

    if (blocksError) {
        console.error(
            'Schedule block error:',
            blocksError
        )

        return NextResponse.json(
            {
                error:
                    'Could not load existing schedule blocks',
            },
            {
                status: 500,
            }
        )
    }

    /*
    =====================================================
    5. KEEP MANUAL BLOCKS OCCUPIED
    =====================================================

    Previous automatically generated blocks are
    intentionally excluded because regeneration
    replaces them.
    */

    const manualBlocks =
        (
            existingBlocks ??
            []
        ).filter(
            (
                block
            ) =>
                block.source ===
                'manual'
        ) as ExistingBlock[]

    console.log(
        'Manual schedule blocks:',
        manualBlocks
    )

    /*
    =====================================================
    6. REMOVE PREVIOUS AUTO BLOCKS
    =====================================================
    */

    const {
        error: deleteError,
    } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq(
            'user_id',
            user.id
        )
        .eq(
            'source',
            'auto'
        )

    if (deleteError) {
        console.error(
            'Schedule cleanup error:',
            deleteError
        )

        return NextResponse.json(
            {
                error:
                    'Could not refresh automatic schedule',
            },
            {
                status: 500,
            }
        )
    }

    /*
    =====================================================
    7. GENERATE NEW SCHEDULE
    =====================================================
    */

    const generatedBlocks =
        generateSchedule(
            validQuests,
            availability,
            manualBlocks
        )

    console.log(
        'Generated schedule blocks:',
        generatedBlocks
    )

    /*
    =====================================================
    8. SAVE GENERATED BLOCKS
    =====================================================
    */

    if (
        generatedBlocks.length >
        0
    ) {
        const rows =
            generatedBlocks.map(
                (block) => ({
                    user_id:
                        user.id,
                    quest_id:
                        block.quest_id,
                    starts_at:
                        block.starts_at,
                    ends_at:
                        block.ends_at,
                    source:
                        block.source,
                })
            )

        const {
            data:
                insertedBlocks,
            error:
                insertError,
        } =
            await supabase
                .from(
                    'schedule_blocks'
                )
                .insert(rows)
                .select()

        if (insertError) {
            console.error(
                'Schedule insert error:',
                insertError
            )

            return NextResponse.json(
                {
                    error:
                        'Could not save generated schedule',
                },
                {
                    status: 500,
                }
            )
        }

        console.log(
            'Inserted schedule blocks:',
            insertedBlocks
        )

        return NextResponse.json({
            message:
                'Schedule generated successfully.',
            blocks:
                insertedBlocks ??
                [],
            scheduled_count:
                insertedBlocks
                    ?.length ??
                0,
            duration_ms:
                Date.now() -
                startTime,
        })
    }

    /*
    =====================================================
    9. NOTHING COULD BE SCHEDULED
    =====================================================
    */

    return NextResponse.json({
        message:
            'No available windows were found for the pending quests.',
        blocks: [],
        scheduled_count: 0,
        duration_ms:
            Date.now() -
            startTime,
    })
}