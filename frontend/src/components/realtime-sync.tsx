"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { mutate } from "swr";

const invalidateUserData = () => {
    mutate("/api/rewards/balance");
    mutate("/api/notifications");
    mutate("/api/friends");
};

export default function RealtimeSync() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        const channels: ReturnType<typeof supabase.channel>[] = [];

        // Re-render the current server component (dashboard and
        // progress stats) without losing scroll or client state.
        const refreshPage = () => {
            if (!cancelled) router.refresh();
        };

        async function setup() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            const uid = user.id;

            // Record any focus sessions that ended while this tab
            // was closed, so participants still get their rewards.
            void fetch("/api/rooms/settle", { method: "POST" }).catch(() => undefined);

            channels.push(
                supabase
                    .channel(`user-data-${uid}`)
                    .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, () => {
                        invalidateUserData();
                        refreshPage();
                    })
                    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, invalidateUserData)
                    .on("postgres_changes", { event: "*", schema: "public", table: "pets", filter: `owner_id=eq.${uid}` }, () => {
                        invalidateUserData();
                        refreshPage();
                    })
                    .subscribe((status) => {
                        if (status === "SUBSCRIBED") invalidateUserData(); // resync after (re)connect
                    })
            );

            // These tables feed the dashboard and progress stats.
            channels.push(
                supabase
                    .channel(`stats-${uid}`)
                    .on("postgres_changes", { event: "*", schema: "public", table: "quests", filter: `user_id=eq.${uid}` }, refreshPage)
                    .on("postgres_changes", { event: "*", schema: "public", table: "focus_sessions", filter: `user_id=eq.${uid}` }, refreshPage)
                    .on("postgres_changes", { event: "*", schema: "public", table: "user_streaks", filter: `user_id=eq.${uid}` }, refreshPage)
                    .on("postgres_changes", { event: "*", schema: "public", table: "schedule_blocks", filter: `user_id=eq.${uid}` }, refreshPage)
                    .subscribe()
            );

            channels.push(
                supabase
                    .channel(`friends-a-${uid}`)
                    .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `user_id=eq.${uid}` }, () => mutate("/api/friends"))
                    .subscribe()
            );

            channels.push(
                supabase
                    .channel(`friends-b-${uid}`)
                    .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `friend_id=eq.${uid}` }, () => mutate("/api/friends"))
                    .subscribe()
            );
        }

        // Catch changes missed while the tab was in the background,
        // or from tables that are not enabled for Realtime.
        const handleVisibility = () => {
            if (document.visibilityState === "visible") refreshPage();
        };

        document.addEventListener("visibilitychange", handleVisibility);

        setup();

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", handleVisibility);
            channels.forEach((c) => supabase.removeChannel(c));
        };
    }, [supabase, router]);

    return null;
}
