import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_NAME_LENGTH = 24;

export async function PATCH(req: Request) {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { name?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (typeof body.name !== "string") {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const name = body.name.replace(/\s+/g, " ").trim();

    if (name.length === 0) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (name.length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: `Name must be at most ${MAX_NAME_LENGTH} characters` }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("pets")
        .update({ name })
        .eq("owner_id", user.id)
        .select("name")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json({ error: "No pet found" }, { status: 404 });
    }

    return NextResponse.json({ name: data.name });
}
