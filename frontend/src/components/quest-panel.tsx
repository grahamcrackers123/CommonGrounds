"use client";

import {
    ActionIcon,
    Badge,
    Box,
    Group,
    Paper,
    Progress,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Check, Circle, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Quest = {
    id: string;
    title: string;
    subject: string | null;
    priority: string | null;
    deadline: string | null;
    status: string;
    completed_at: string | null;
};

const PRIORITY_COLOR: Record<string, string> = {
    high: "red",
    medium: "yellow",
    low: "gray",
};

export default function QuestPanel() {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    const startOfToday = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const [pendingRes, completedRes] = await Promise.all([
                    fetch("/api/quests?status=pending"),
                    fetch("/api/quests?status=completed"),
                ]);
                const pending = pendingRes.ok ? ((await pendingRes.json()).quests ?? []) : [];
                const completed = completedRes.ok ? ((await completedRes.json()).quests ?? []) : [];
                setQuests([...pending, ...completed]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const pending = quests.filter((q) => q.status === "pending");
    const completedToday = quests.filter(
        (q) =>
            q.status === "completed" &&
            q.completed_at &&
            new Date(q.completed_at).getTime() >= startOfToday
    );
    const total = pending.length + completedToday.length;
    const progress = total === 0 ? 0 : Math.round((completedToday.length / total) * 100);

    const completeQuest = async (quest: Quest) => {
        if (quest.status === "completed") return;
        setQuests((qs) =>
            qs.map((q) =>
                q.id === quest.id
                    ? { ...q, status: "completed", completed_at: new Date().toISOString() }
                    : q
            )
        );
        try {
            const res = await fetch(`/api/quests/${encodeURIComponent(quest.id)}/complete`, {
                method: "PATCH",
            });
            const data = await res.json();
            if (!res.ok) {
                setQuests((qs) => qs.map((q) => (q.id === quest.id ? quest : q)));
                notifications.show({
                    title: "Could not complete quest",
                    message: data?.error ?? "Try again later.",
                    color: "red",
                });
                return;
            }
            notifications.show({
                title: "Quest completed!",
                message: `"${quest.title}" marked as done.`,
                color: "green",
            });
        } catch {
            setQuests((qs) => qs.map((q) => (q.id === quest.id ? quest : q)));
            notifications.show({
                title: "Could not complete quest",
                message: "You appear to be offline.",
                color: "red",
            });
        }
    };

    return (
        <Paper p='lg' radius='lg' shadow='sm' withBorder>
            <Group justify='space-between' mb='md'>
                <Group gap={8}>
                    <ThemeIcon radius='lg' variant='light' color='green' size={32}>
                        <Target size={18} />
                    </ThemeIcon>
                    <Title order={3} fz='lg' fw={700}>
                        Today&apos;s Quests
                    </Title>
                </Group>
                <Badge variant='light' color='green'>
                    {completedToday.length}/{total} completed
                </Badge>
            </Group>

            <Stack gap='xs' mb='md'>
                {loading ? (
                    <Text c='dimmed' fz='sm'>
                        Loading quests…
                    </Text>
                ) : quests.length === 0 ? (
                    <Text c='dimmed' fz='sm'>
                        No quests yet. Add your first task to get started.
                    </Text>
                ) : (
                    [...pending, ...completedToday].map((q) => {
                        const overdue =
                            q.status === "pending" &&
                            q.deadline &&
                            new Date(q.deadline).getTime() < startOfToday;
                        return (
                            <Group
                                key={q.id}
                                justify='space-between'
                                p='xs'
                                style={{
                                    borderRadius: 10,
                                    backgroundColor: q.status === "completed" ? "#F1F3F5" : "#F8F9FA",
                                }}
                                wrap='nowrap'
                            >
                                <Group gap={10} wrap='nowrap'>
                                    <ActionIcon
                                        variant={q.status === "completed" ? "filled" : "default"}
                                        color={q.status === "completed" ? "green" : "gray"}
                                        radius='xl'
                                        onClick={() => completeQuest(q)}
                                        aria-label={`Mark "${q.title}" as complete`}
                                    >
                                        {q.status === "completed" ? (
                                            <Check size={14} />
                                        ) : (
                                            <Circle size={14} />
                                        )}
                                    </ActionIcon>
                                    <Box>
                                        <Text
                                            fz='sm'
                                            fw={600}
                                            td={q.status === "completed" ? "line-through" : undefined}
                                        >
                                            {q.title}
                                        </Text>
                                        <Group gap={6}>
                                            {q.subject && (
                                                <Text fz='xs' c='dimmed'>
                                                    {q.subject}
                                                </Text>
                                            )}
                                            {q.priority && q.priority !== "medium" && (
                                                <Badge
                                                    size='xs'
                                                    variant='light'
                                                    color={PRIORITY_COLOR[q.priority] ?? "gray"}
                                                >
                                                    {q.priority}
                                                </Badge>
                                            )}
                                            {q.deadline && q.status === "pending" && (
                                                <Text fz='xs' c={overdue ? "red" : "dimmed"}>
                                                    Due{" "}
                                                    {new Date(q.deadline).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </Text>
                                            )}
                                        </Group>
                                    </Box>
                                </Group>
                                {q.status === "completed" && (
                                    <Badge size='xs' variant='light' color='green'>
                                        Done
                                    </Badge>
                                )}
                            </Group>
                        );
                    })
                )}
            </Stack>

            <Group justify='space-between' align='center' mb={6}>
                <Text fz='sm' fw={600}>
                    Daily progress
                </Text>
                <Text fz='sm' fw={700} c='green'>
                    {progress}%
                </Text>
            </Group>
            <Progress value={progress} size='lg' radius='xl' color='green' />
        </Paper>
    );
}