import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { processMaterial } from '../process-material'

export async function POST(request: Request) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const body = await request.json()
    const materialId = body.materialId?.trim()

    if (!materialId) {
        return NextResponse.json(
            { error: 'materialId is required' },
            { status: 400 }
        )
    }

    try {
        await processMaterial(materialId, user.id)

        return NextResponse.json({
            message: 'Material processed successfully.',
        })
    } catch (error) {
        console.error('Material processing error:', error)

        return NextResponse.json(
            { error: 'Could not process material.' },
            { status: 500 }
        )
    }
}