import { createClient } from '@/lib/supabase/server'
import { searchMaterials } from '../search-materials'
import { NextResponse } from 'next/server'

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
    const query = body.query?.trim()

    if (!query) {
        return NextResponse.json(
            { error: 'Query is required' },
            { status: 400 }
        )
    }

    try {
        const results = await searchMaterials(user.id, query)

        return NextResponse.json({
            results,
        })
    } catch (error) {
        console.error('Material search test error:', error)

        return NextResponse.json(
            { error: 'Could not search materials' },
            { status: 500 }
        )
    }
}