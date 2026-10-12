"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import { mutate } from "swr";

const invalidateUserData = () => {
    mutate("/api/rewards/balance");
    mutate("/api/notifications");
    mutate("/api/friends");
};

export default function RealtimeSync() {
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        let cancelled = false;
        const channels: ReturnType<typeof supabase.channel>[] = [];

        async function setup() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            const uid = user.id;

            channels.push(
                supabase
                    .channel(`user-data-${uid}`)
                    .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, invalidateUserData)
                    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, invalidateUserData)
                    .on("postgres_changes", { event: "*", schema: "public", table: "pets", filter: `owner_id=eq.${uid}` }, invalidateUserData)
                    .subscribe((status) => {
                        if (status === "SUBSCRIBED") invalidateUserData(); // resync after (re)connect
                    })
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

        setup();

        return () => {
            cancelled = true;
            channels.forEach((c) => supabase.removeChannel(c));
        };
    }, [supabase]);

    return null;
}