"use client";

import type { DailyState, MissionId } from "@/lib/daily";
import { Badge, Box, Button, Flex, Group, Image, Loader, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BatteryCharging, CalendarCheck2, Check, Clock, Gift, Lock, RefreshCw, Target, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MISSION_ICONS: Record<MissionId, typeof Target> = {
    quest_1: Target,
    focus_25: Clock,
    quest_2: Target,
};

const MISSION_TINTS: Record<MissionId, string> = {
    quest_1: "light-dark(#EBFBEE, #173128)",
    focus_25: "light-dark(#E7F5FF, #1B2A3A)",
    quest_2: "light-dark(#F3F0FF, #241F3D)",
};

function rewardLabel(coins: number, xp: number, energy = 0): string {
    const parts: string[] = [];
    if (coins > 0) parts.push(`${coins} coins`);
    if (xp > 0) parts.push(`${xp} XP`);
    if (energy > 0) parts.push(`${energy} pet energy`);
    return parts.join(" • ");
}

type ClaimPayload = { type: "login" } | { type: "mission"; mission: MissionId } | { type: "bonus" };

export default function DailyRewards() {
    const router = useRouter();
    const [state, setState] = useState<DailyState | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [claiming, setClaiming] = useState<string | null>(null);

    const load = async (showLoading = false) => {
        if (showLoading) {
            setLoading(true);
            setFailed(false);
        }
        try {
            const res = await fetch("/api/daily/status");
            if (!res.ok) {
                setFailed(true);
                return;
            }
            setState((await res.json()) as DailyState);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/daily/status");
                if (!active) return;
                if (!res.ok) {
                    setFailed(true);
                } else {
                    setState((await res.json()) as DailyState);
                }
            } catch {
                if (active) setFailed(true);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const claim = async (payload: ClaimPayload, key: string, message: string) => {
        setClaiming(key);
        try {
            const res = await fetch("/api/daily/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                notifications.show({
                    title: "Could not claim",
                    message: data?.error ?? "Try again later.",
                    color: "red",
                });
                return;
            }
            setState(data as DailyState);
            notifications.show({ title: "Reward claimed!", message, color: "green" });
            router.refresh();
        } catch {
            notifications.show({
                title: "Could not claim",
                message: "You appear to be offline.",
                color: "red",
            });
        } finally {
            setClaiming(null);
        }
    };

    if (loading) {
        return (
            <Paper p="lg" radius="lg" shadow="sm" withBorder mb={28}>
                <Group justify="center" gap="sm" py="xl">
                    <Loader size="sm" />
                    <Text c="dimmed" fz="sm">
                        Loading daily rewards…
                    </Text>
                </Group>
            </Paper>
        );
    }

    if (failed || !state) {
        return (
            <Paper p="lg" radius="lg" shadow="sm" withBorder mb={28}>
                <Group justify="space-between" wrap="nowrap">
                    <Text c="dimmed" fz="sm">
                        Daily rewards could not be loaded.
                    </Text>
                    <Button size="xs" variant="light" radius="xl" leftSection={<RefreshCw size={14} />} onClick={() => load(true)}>
                        Retry
                    </Button>
                </Group>
            </Paper>
        );
    }

    const completedMissions = state.missions.filter((mission) => mission.complete).length;

    return (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mb={28}>
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
                <Group justify="space-between" mb="md" wrap="nowrap">
                    <Group gap={8}>
                        <ThemeIcon radius="lg" variant="light" color="blue" size={32}>
                            <CalendarCheck2 size={18} />
                        </ThemeIcon>
                        <Title order={3} fz="lg" fw={700}>
                            Daily Login
                        </Title>
                    </Group>
                    <Badge variant="light" color="blue">
                        Day {state.login.day} of {state.login.rewards.length}
                    </Badge>
                </Group>

                <SimpleGrid cols={4} spacing={4} mb="md">
                    {state.login.rewards.map((reward) => {
                        const isToday = reward.day === state.login.day && !state.login.claimed;
                        const isClaimed = state.login.claimed ? reward.day <= state.login.day : reward.day < state.login.day;
                        return (
                            <Tooltip key={reward.day} label={`Day ${reward.day}: ${rewardLabel(reward.coins, reward.xp, reward.energy)}`} withArrow>
                                <Paper
                                    p={6}
                                    radius="md"
                                    withBorder
                                    style={{
                                        textAlign: "center",
                                        borderColor: isToday ? "var(--mantine-color-blue-6)" : undefined,
                                        backgroundColor: isClaimed
                                            ? "light-dark(#EBFBEE, #173128)"
                                            : isToday
                                                ? "light-dark(#E7F5FF, #1B2A3A)"
                                                : undefined,
                                        opacity: isClaimed || isToday ? 1 : 0.7,
                                    }}
                                    w={100}
                                    h={100}
                                >
                                    <Text fz="sm" fw={700} tt="uppercase" c={isToday ? "blue" : "dimmed"}>
                                        Day {reward.day}
                                    </Text>
                                    <Stack gap={1} mt={4} align="center">
                                        {isClaimed ? (
                                            <Check size={16} color="light-dark(#2F9E44, #51CF66)" />
                                        ) : (
                                            <>
                                                <Flex align="center" gap={2}>
                                                    <Image src="/assets/currency/student-coin.png" alt="" w={11} h={11} />
                                                    <Text fz="xs" fw={700}>
                                                        {reward.coins}
                                                    </Text>
                                                </Flex>
                                                {reward.xp > 0 && (
                                                    <Flex align="center" gap={2}>
                                                        <Zap size={10} color="light-dark(#E8590C, #FFA94D)" />
                                                        <Text fz="xs" c="dimmed" fw={600}>
                                                            {reward.xp}
                                                        </Text>
                                                    </Flex>
                                                )}
                                                {reward.energy > 0 && (
                                                    <Flex align="center" gap={2}>
                                                        <BatteryCharging size={10} color="light-dark(#0CA678, #38D9A9)" />
                                                        <Text fz="xs" c="dimmed" fw={600}>
                                                            {reward.energy}
                                                        </Text>
                                                    </Flex>
                                                )}
                                            </>
                                        )}
                                    </Stack>
                                </Paper>
                            </Tooltip>
                        );
                    })}
                </SimpleGrid>

                {
                    state.login.claimed ? (
                        <Badge fullWidth size="lg" radius="md" variant="light" color="green" leftSection={<Check size={14} />}>
                            Claimed today
                        </Badge>
                    ) : (
                        <Button
                            fullWidth
                            radius="lg"
                            leftSection={<Gift size={16} />}
                            loading={claiming === "login"}
                            onClick={() =>
                                claim(
                                    { type: "login" },
                                    "login",
                                    `Day ${state.login.day}: ${rewardLabel(
                                        state.login.rewards[state.login.day - 1]?.coins ?? 0,
                                        state.login.rewards[state.login.day - 1]?.xp ?? 0,
                                        state.login.rewards[state.login.day - 1]?.energy ?? 0
                                    )}`
                                )
                            }
                        >
                            Claim day {state.login.day} reward
                        </Button>
                    )
                }
            </Paper >

            <Paper p="lg" radius="lg" shadow="sm" withBorder>
                <Group justify="space-between" mb="md" wrap="nowrap">
                    <Group gap={8}>
                        <ThemeIcon radius="lg" variant="light" color="green" size={32}>
                            <Target size={18} />
                        </ThemeIcon>
                        <Title order={3} fz="lg" fw={700}>
                            Daily Missions
                        </Title>
                    </Group>
                    <Badge variant="light" color="green">
                        {completedMissions}/{state.missions.length} complete
                    </Badge>
                </Group>

                <Stack gap="md">
                    {state.missions.map((mission) => {
                        const Icon = MISSION_ICONS[mission.id];
                        const percent = Math.round((mission.progress / mission.target) * 100);
                        return (
                            <Box key={mission.id}>
                                <Group justify="space-between" wrap="nowrap" mb={6} align="flex-start">
                                    <Group gap={8} wrap="nowrap">
                                        <ThemeIcon
                                            radius="lg"
                                            variant="light"
                                            color="gray"
                                            size={32}
                                            style={{ backgroundColor: MISSION_TINTS[mission.id], flexShrink: 0 }}
                                        >
                                            <Icon size={16} style={{ color: "light-dark(#495057, #CED4DA)" }} />
                                        </ThemeIcon>
                                        <Box>
                                            <Text fz="sm" fw={700}>
                                                {mission.title}
                                            </Text>
                                            <Text fz="xs" c="dimmed">
                                                {mission.description}
                                            </Text>
                                        </Box>
                                    </Group>
                                    {mission.claimed ? (
                                        <Badge variant="light" color="green" leftSection={<Check size={12} />}>
                                            Claimed
                                        </Badge>
                                    ) : mission.complete ? (
                                        <Button
                                            size="xs"
                                            radius="xl"
                                            loading={claiming === mission.id}
                                            onClick={() =>
                                                claim(
                                                    { type: "mission", mission: mission.id },
                                                    mission.id,
                                                    `${mission.title}: ${rewardLabel(mission.coins, mission.xp)}`
                                                )
                                            }
                                        >
                                            Claim
                                        </Button>
                                    ) : null}
                                </Group>
                                <Group justify="space-between" mb={4}>
                                    <Text fz="xs" c="dimmed">
                                        {mission.progress} / {mission.target} {mission.unit}
                                    </Text>
                                    <Text fz="xs" c="dimmed" fw={600}>
                                        +{rewardLabel(mission.coins, mission.xp)}
                                    </Text>
                                </Group>
                                <Progress value={percent} color={mission.complete ? "green" : "blue"} radius="xl" size="sm" />
                            </Box>
                        );
                    })}
                </Stack>

                <Paper
                    mt="lg"
                    p="md"
                    radius="md"
                    withBorder
                    style={{
                        borderColor: state.bonus.claimed
                            ? "var(--mantine-color-green-6)"
                            : state.bonus.eligible
                                ? "var(--mantine-color-blue-6)"
                                : undefined,
                        backgroundColor: state.bonus.claimed
                            ? "light-dark(#EBFBEE, #173128)"
                            : state.bonus.eligible
                                ? "light-dark(#E7F5FF, #1B2A3A)"
                                : undefined,
                    }}
                >
                    <Group justify="space-between" wrap="nowrap">
                        <Group gap={8}>
                            <ThemeIcon radius="lg" variant="light" color="yellow" size={32}>
                                <Gift size={16} />
                            </ThemeIcon>
                            <Box>
                                <Text fz="sm" fw={700}>
                                    All missions bonus
                                </Text>
                                <Text fz="xs" c="dimmed">
                                    +{rewardLabel(state.bonus.coins, state.bonus.xp)}
                                </Text>
                            </Box>
                        </Group>
                        {state.bonus.claimed ? (
                            <Badge variant="light" color="green" leftSection={<Check size={12} />}>
                                Claimed
                            </Badge>
                        ) : state.bonus.eligible ? (
                            <Button
                                size="xs"
                                radius="xl"
                                color="yellow"
                                loading={claiming === "bonus"}
                                onClick={() =>
                                    claim(
                                        { type: "bonus" },
                                        "bonus",
                                        `All missions bonus — ${rewardLabel(state.bonus.coins, state.bonus.xp)}`
                                    )
                                }
                            >
                                Claim bonus
                            </Button>
                        ) : (
                            <Badge variant="light" color="gray" leftSection={<Lock size={12} />}>
                                Locked
                            </Badge>
                        )}
                    </Group>
                </Paper>
            </Paper>
        </SimpleGrid >
    );
}
