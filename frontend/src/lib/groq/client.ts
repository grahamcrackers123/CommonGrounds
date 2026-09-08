import Groq from 'groq-sdk'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

type ChatMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export async function chat(messages: ChatMessage[]) {
    const completion = await groq.chat.completions.create({
        messages,
        model: 'openai/gpt-oss-20b',
    })

    return {
        content: completion.choices[0]?.message?.content ?? '',
        model: completion.model,
        usage: completion.usage,
    }
}