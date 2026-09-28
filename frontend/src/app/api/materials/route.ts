import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_FILE_TYPES = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
} as const

type AllowedExtension = keyof typeof ALLOWED_FILE_TYPES

function getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')

    if (lastDot === -1) {
        return ''
    }

    return filename.slice(lastDot + 1).toLowerCase()
}

function sanitizeFilename(filename: string): string {
    const extension = getExtension(filename)

    const baseName =
        filename
            .slice(0, filename.lastIndexOf('.'))
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .slice(0, 100) || 'material'

    return extension ? `${baseName}.${extension}` : baseName
}

export async function POST(request: Request) {
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

    // 2. Read multipart form data
    const formData = await request.formData()

    const file = formData.get('file')
    const subjectValue = formData.get('subject')
    const questIdValue = formData.get('questId')

    if (!(file instanceof File)) {
        return NextResponse.json(
            { error: 'A file is required' },
            { status: 400 }
        )
    }

    const subject =
        typeof subjectValue === 'string' && subjectValue.trim()
            ? subjectValue.trim()
            : null

    const questId =
        typeof questIdValue === 'string' && questIdValue.trim()
            ? questIdValue.trim()
            : null

    // 3. Validate file extension
    const extension = getExtension(file.name) as AllowedExtension

    if (!extension || !(extension in ALLOWED_FILE_TYPES)) {
        return NextResponse.json(
            {
                error: 'Unsupported file type. Only PDF, DOCX, TXT, and MD files are allowed.',
            },
            { status: 400 }
        )
    }

    // 4. Validate MIME type
    const expectedMimeType = ALLOWED_FILE_TYPES[extension]

    if (file.type && file.type !== expectedMimeType) {
        return NextResponse.json(
            { error: 'File type does not match its extension.' },
            { status: 400 }
        )
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: 'File is too large. Maximum size is 10 MB.' },
            { status: 400 }
        )
    }

    if (file.size === 0) {
        return NextResponse.json(
            { error: 'The uploaded file is empty.' },
            { status: 400 }
        )
    }

    // 6. Create a safe filename and user-specific storage path
    const safeFilename = sanitizeFilename(file.name)

    const uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`

    const storagePath = `${user.id}/${uniqueFilename}`

    // 7. Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(storagePath, file, {
            contentType: expectedMimeType,
            upsert: false,
        })

    if (uploadError) {
        console.error('Material upload error:', uploadError)

        return NextResponse.json(
            { error: 'Could not upload material.' },
            { status: 500 }
        )
    }

    // 8. Save material metadata
    const { data: material, error: materialError } = await supabase
        .from('materials')
        .insert({
            user_id: user.id,
            filename: file.name,
            storage_path: storagePath,
            subject,
            quest_id: questId,
            file_type: extension,
            file_size: file.size,
        })
        .select()
        .single()

    // 9. Remove the uploaded file if metadata creation fails
    if (materialError) {
        console.error('Material metadata error:', materialError)

        await supabase.storage
            .from('materials')
            .remove([storagePath])

        return NextResponse.json(
            { error: 'Could not save material information.' },
            { status: 500 }
        )
    }

    return NextResponse.json(
        {
            message: 'Material uploaded successfully.',
            material,
        },
        { status: 201 }
    )
}


export async function GET() {
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

    // 2. Load the user's materials
    const { data: materials, error } = await supabase
        .from('materials')
        .select(`
            id,
            filename,
            storage_path,
            subject,
            quest_id,
            file_type,
            file_size,
            created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Material list error:', error)

        return NextResponse.json(
            { error: 'Could not load materials.' },
            { status: 500 }
        )
    }

    return NextResponse.json({
        materials: materials ?? [],
    })
}