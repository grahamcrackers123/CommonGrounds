import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/materials/:id/url
// Returns a short-lived signed URL so the owner can open or download
// their uploaded file from the private storage bucket.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: material, error } = await supabase
    .from('materials')
    .select('storage_path, filename')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('materials')
    .createSignedUrl(material.storage_path, 60)

  if (signError || !signed?.signedUrl) {
    console.error('Material signed URL error:', signError)

    return NextResponse.json(
      { error: 'Could not create a link for this material.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    url: signed.signedUrl,
    filename: material.filename,
  })
}
