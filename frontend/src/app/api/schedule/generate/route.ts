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
    const supabase = await createClient()

    // 1. Check authentication
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    // 2. Load the user's weekly availability
    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('weekly_availability')
            .eq('id', user.id)
            .single()

    if (profileError || !profile) {
        console.error(
            'Schedule profile error:',
            profileError
        )

        return NextResponse.json(
            { error: 'Could not load profile availability' },
            { status: 500 }
        )
    }

    const availability =
        Array.isArray(profile.weekly_availability)
            ? (profile.weekly_availability as AvailabilityWindow[])
            : []

    if (availability.length === 0) {
        return NextResponse.json(
            {
                error:
                    'No weekly availability is configured.',
            },
            { status: 400 }
        )
    }

    // 3. Load the user's pending quests
    const { data: quests, error: questsError } =
        await supabase
            .from('quests')
            .select(
                'id, deadline, priority, estimated_duration'
            )
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .not('deadline', 'is', null)
            .not('estimated_duration', 'is', null)

    if (questsError) {
        console.error(
            'Schedule quest error:',
            questsError
        )

        return NextResponse.json(
            { error: 'Could not load quests' },
            { status: 500 }
        )
    }

    const validQuests = (quests ?? []) as Quest[]

    if (validQuests.length === 0) {
        return NextResponse.json({
            message: 'No pending quests need scheduling.',
            blocks: [],
            duration_ms: Date.now() - startTime,
        })
    }

    // 4. Load existing schedule blocks
    const { data: existingBlocks, error: blocksError } =
        await supabase
            .from('schedule_blocks')
            .select('starts_at, ends_at, source')
            .eq('user_id', user.id)

    if (blocksError) {
        console.error(
            'Schedule block error:',
            blocksError
        )

        return NextResponse.json(
            { error: 'Could not load existing schedule blocks' },
            { status: 500 }
        )
    }

    // Only MANUAL blocks should remain occupied during regeneration.
    // Previous AUTO blocks are going to be replaced.
    const manualBlocks = (existingBlocks ?? []).filter(
        (block) => block.source === 'manual'
    ) as ExistingBlock[]

    // 5. Remove the previous automatically generated plan
    const { error: deleteError } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('user_id', user.id)
        .eq('source', 'auto')

    if (deleteError) {
        console.error(
            'Schedule cleanup error:',
            deleteError
        )

        return NextResponse.json(
            { error: 'Could not refresh automatic schedule' },
            { status: 500 }
        )
    }

    // 6. Generate a fresh schedule using only manual blocks
    const generatedBlocks = generateSchedule(
        validQuests,
        availability,
        manualBlocks
    )

    // 7. Save the newly generated automatic blocks
    if (generatedBlocks.length > 0) {
        const rows = generatedBlocks.map((block) => ({
            user_id: user.id,
            quest_id: block.quest_id,
            starts_at: block.starts_at,
            ends_at: block.ends_at,
            source: block.source,
        }))

        const {
            data: insertedBlocks,
            error: insertError,
        } = await supabase
            .from('schedule_blocks')
            .insert(rows)
            .select()

        if (insertError) {
            console.error(
                'Schedule insert error:',
                insertError
            )

            return NextResponse.json(
                { error: 'Could not save generated schedule' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: 'Schedule generated successfully.',
            blocks: insertedBlocks ?? [],
            scheduled_count: insertedBlocks?.length ?? 0,
            duration_ms: Date.now() - startTime,
        })
    }

    return NextResponse.json({
        message:
            'No available windows were found for the pending quests.',
        blocks: [],
        scheduled_count: 0,
        duration_ms: Date.now() - startTime,
    })
}