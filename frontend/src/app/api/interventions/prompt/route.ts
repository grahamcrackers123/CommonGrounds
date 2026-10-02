import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPrompt, getActivePrompt, type PromptType } from "@/lib/interventions/prompts";

const PROMPT_TYPES: PromptType[] = [
  "inactivity",
  "restart_10min",
  "schedule_extension",
  "comeback_reward",
  "progress_feedback",
];

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; questId?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.type || !PROMPT_TYPES.includes(body.type as PromptType)) {
    return NextResponse.json({ error: "Invalid prompt type" }, { status: 400 });
  }

  try {
    const result = await createPrompt(supabase, {
      userId: user.id,
      type: body.type as PromptType,
      questId: body.questId,
      payload: body.payload,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create prompt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prompt = await getActivePrompt(supabase, user.id);
  return NextResponse.json({ prompt });
}