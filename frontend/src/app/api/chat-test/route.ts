import { chat } from '@/lib/groq/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { message } = await request.json()
  const start = Date.now()

  const result = await chat([{ role: 'assistant', content: message }])

  return NextResponse.json({
    ...result,
    latency_ms: Date.now() - start,
  })
}