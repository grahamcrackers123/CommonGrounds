import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

const rateLimit = new Map<
    string,
    { count: number; resetAt: number }
>()

const MAX_REQUESTS = 10
const WINDOW_MS = 60 * 1000
const TIMEOUT_MS = 30 * 1000

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

    // 2. Read the user's message
    const body = await request.json()
    const message = body.message?.trim()

    if (!message) {
        return NextResponse.json(
            { error: 'Message is required' },
            { status: 400 }
        )
    }

    // 3. Simple per-user rate limit
    const now = Date.now()
    const existing = rateLimit.get(user.id)

    if (!existing || now >= existing.resetAt) {
        rateLimit.set(user.id, {
            count: 1,
            resetAt: now + WINDOW_MS,
        })
    } else {
        if (existing.count >= MAX_REQUESTS) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            )
        }

        existing.count += 1
    }

    // 4. Load the user's academic profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            program,
            level,
            school,
            enrollment_status,
            study_time,
            focus_length,
            subjects,
            weekly_availability,
            coursework_priorities
        `)
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error('Profile load error:', profileError)

        return NextResponse.json(
            { error: 'Could not load user profile' },
            { status: 500 }
        )
    }

    // 5. Load the user's last 20 chat messages
    const { data: previousMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

    if (messagesError) {
        console.error('Chat history error:', messagesError)

        return NextResponse.json(
            { error: 'Could not load chat history' },
            { status: 500 }
        )
    }

    // Oldest → newest for the model
    const history = [...(previousMessages ?? [])].reverse()

    // 6. Save the user's message
    const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert({
            user_id: user.id,
            role: 'user',
            content: message,
        })

    if (userMessageError) {
        console.error('User message save error:', userMessageError)

        return NextResponse.json(
            { error: 'Could not save message' },
            { status: 500 }
        )
    }

    // 7. Build Ask Wasi's personalized system prompt
    const systemPrompt = `
You are Ask Wasi, the personalized learning companion for CommonGrounds.

Use the student's profile and conversation history to give helpful,
practical, and personalized academic guidance.

Student profile:
- Program: ${profile.program ?? 'Not provided'}
- Level: ${profile.level ?? 'Not provided'}
- School: ${profile.school ?? 'Not provided'}
- Enrollment status: ${profile.enrollment_status ?? 'Not provided'}
- Preferred study time: ${profile.study_time ?? 'Not provided'}
- Focus length: ${profile.focus_length ?? 'Not provided'} minutes
- Subjects: ${JSON.stringify(profile.subjects ?? [])}
- Weekly availability: ${JSON.stringify(profile.weekly_availability ?? {})}
- Coursework priorities: ${JSON.stringify(profile.coursework_priorities ?? {})}

Adapt your recommendations to the student's available study time,
subjects, priorities, and focus length.

Be supportive, concise, and practical.
`

    const messages = [
        {
            role: 'system' as const,
            content: systemPrompt,
        },
        ...history.map((item) => ({
            role: item.role as 'user' | 'assistant',
            content: item.content,
        })),
        {
            role: 'user' as const,
            content: message,
        },
    ]

    // 8. Stream the response from Groq
    const timeout = setTimeout(() => {}, TIMEOUT_MS)

    try {
   const completion = await groq.chat.completions.create({
    messages,
    model: 'openai/gpt-oss-20b',
    stream: true,
})

        const encoder = new TextEncoder()
        let assistantContent = ''

        const stream = new ReadableStream({
            async start(streamController) {
                try {
                    for await (const chunk of completion) {
                        const token =
                            chunk.choices[0]?.delta?.content ?? ''

                        if (token) {
                            assistantContent += token

                            streamController.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({ token })}\n\n`
                                )
                            )
                        }
                    }

                    // 9. Save the completed assistant response
                    if (assistantContent) {
                        const { error: assistantMessageError } =
                            await supabase
                                .from('chat_messages')
                                .insert({
                                    user_id: user.id,
                                    role: 'assistant',
                                    content: assistantContent,
                                })

                        if (assistantMessageError) {
                            console.error(
                                'Assistant message save error:',
                                assistantMessageError
                            )
                        }
                    }

                    streamController.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ done: true })}\n\n`
                        )
                    )

                    streamController.close()
                } catch (error) {
                    console.error('Groq streaming error:', error)

                    streamController.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                error: 'Failed to generate response',
                            })}\n\n`
                        )
                    )

                    streamController.close()
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        })
    } catch (error) {
        console.error('Ask Wasi error:', error)

        return NextResponse.json(
            { error: 'Failed to generate response' },
            { status: 500 }
        )
    } finally {
        clearTimeout(timeout)
    }
}