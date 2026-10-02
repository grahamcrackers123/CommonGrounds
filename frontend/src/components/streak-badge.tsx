"use client";

import { Badge, Tooltip } from "@mantine/core";
import { Flame } from "lucide-react";
import { useEffect, useState } from "react";

export default function StreakBadge({
    initialStreak = 0,
}: {
    initialStreak?: number;
}) {
    const [streak, setStreak] = useState(initialStreak);

    useEffect(() => {
        let cancelled = false;

        async function loadStreak() {
            try {
                const response = await fetch("/api/streak");
                if (!response.ok) {
                    return;
                }
                const data = await response.json();
                if (!cancelled) {
                    setStreak(data.streak?.current_streak ?? 0);
                }
            } catch (error) {
                console.error("Could not load streak:", error);
            }
        }

        loadStreak();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Tooltip label={`${streak}-day streak`}>
            <Badge
                size="lg"
                radius="xl"
                variant="light"
                color="pink"
                leftSection={<Flame size={14} fill="currentColor" />}
            >
                {streak} day streak
            </Badge>
        </Tooltip>
    );
}
