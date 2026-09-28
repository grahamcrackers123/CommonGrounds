import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { respondToPrompt, type PromptAction } from "@/lib/interventions/prompts";

const ACTIONS: PromptAction[] = ["accept", "postpone", "dismiss"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !ACTIONS.includes(body.action as PromptAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result = await respondToPrompt(supabase, {
      promptId: id,
      userId: user.id,
      action: body.action as PromptAction,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to respond";
    const status = message === "Prompt not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}