import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    recordBehavioralEvent,
    type BehavioralEventType,
} from "@/lib/interventions/events";

const EVENT_TYPES: BehavioralEventType[] = [
    "session_started",
    "session_completed",
    "session_missed",
    "quest_overdue",
    "inactivity",
    "reschedule_abandoned",
];

export async function POST(request: Request) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    let body: {
        type?: string;
        metadata?: Record<string, unknown>;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    if (
        !body.type ||
        !EVENT_TYPES.includes(
            body.type as BehavioralEventType
        )
    ) {
        return NextResponse.json(
            { error: "Invalid behavioral event type" },
            { status: 400 }
        );
    }

    const { data, error } = await recordBehavioralEvent(
        user.id,
        body.type as BehavioralEventType,
        body.metadata ?? {}
    );

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json(
        { event: data },
        { status: 201 }
    );
}