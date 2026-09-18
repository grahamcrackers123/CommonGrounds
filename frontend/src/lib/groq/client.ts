import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function chat(messages: { role: 'assistant'; content: string }[]) {
  const completion = await groq.chat.completions.create({
    messages,
    model: 'openai/gpt-oss-20b',
  })

  return {
    content: completion.choices[0]?.message?.content ?? '',
    model: completion.model,
    usage: completion.usage, // prompt_tokens, completion_tokens, total_tokens
  }
}