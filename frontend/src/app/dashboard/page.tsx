import CustomButton from "@/components/button";
import DailyRewards from "@/components/daily-rewards";
import { getPetGrowth } from "@/components/petgrowth";
import QuestPanel from "@/components/quest-panel";
import StreakBadge from "@/components/streak-badge";
import TutorialModal from "@/components/tutorialmodal";
import WelcomeRewardModal from "@/components/welcomerewardmodal";
import WorkloadStatusChip from "@/components/workload-status-chip";
import { applyEnergyDecay } from "@/lib/pet-energy";
import { recordDailyStreak } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";
import { Badge, Box, Flex, Group, Image, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { BookOpen, Clock, Coins, Flame, TrendingUp, Zap } from "lucide-react";

type FocusSession = {
    started_at: string | null;
    duration_min: number | null;
    streak_xp_earned: number | null;
    coins_earned: number | null;
};

type ScheduleBlockWithQuest = {
    starts_at: string;
    ends_at: string;
    quests: { title: string } | null;
};

type DayBucket = { date: Date; minutes: number; xp: number; coins: number };

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtMinutes(min: number): string {
    const total = Math.round(min);
    if (total <= 0) return "0m";
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function pctDelta(current: number, previous: number): string {
    if (previous <= 0) return current > 0 ? "new" : "—";
    const pct = Math.round(((current - previous) / previous) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek = new Date(startToday);
    startWeek.setDate(startToday.getDate() - 6);

    const [
        { data: profile },
        { data: pet },
        { data: streakData },
        { data: sessions },
        { data: nextBlock },
        { data: nextQuest },
    ] = await Promise.all([
        supabase
            .from("profiles")
            .select("new_user_reward_claimed, display_name, student_coins, tutorial_completed")
            .eq("id", user.id)
            .single(),
        supabase.from("pets").select("*").eq("owner_id", user.id).maybeSingle(),
        recordDailyStreak(supabase, user.id),
        supabase
            .from("focus_sessions")
            .select("started_at, duration_min, streak_xp_earned, coins_earned")
            .eq("user_id", user.id)
            .gte("started_at", startWeek.toISOString()),
        supabase
            .from("schedule_blocks")
            .select("starts_at, ends_at, quests(title)")
            .eq("user_id", user.id)
            .gt("starts_at", now.toISOString())
            .order("starts_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
        supabase
            .from("quests")
            .select("id, title, deadline")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("deadline", { ascending: true, nullsFirst: false })
            .limit(1)
            .maybeSingle(),
    ]);

    const days: DayBucket[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startWeek);
        d.setDate(startWeek.getDate() + i);
        days.push({ date: d, minutes: 0, xp: 0, coins: 0 });
    }
    for (const s of (sessions ?? []) as FocusSession[]) {
        if (!s.started_at || !s.duration_min) continue;
        const d = new Date(s.started_at);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const bucket = days.find((b) => b.date.getTime() === dayStart.getTime());
        if (!bucket) continue;
        bucket.minutes += s.duration_min;
        bucket.xp += s.streak_xp_earned ?? 0;
        bucket.coins += s.coins_earned ?? 0;
    }

    const today = days[6];
    const yesterday = days[5];
    const weekTotal = days.reduce((sum, d) => sum + d.minutes, 0);
    const maxDay = Math.max(...days.map((d) => d.minutes), 1);

    const petEnergy = pet ? await applyEnergyDecay(supabase, pet) : 0;

    const showReward = !profile?.new_user_reward_claimed;
    const showTutorial = profile?.new_user_reward_claimed && !profile?.tutorial_completed;
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const statCards = [
        {
            label: "Study Time",
            icon: Clock,
            tint: "light-dark(#E7F5FF, #1B2A3A)",
            color: "light-dark(#1C7ED6, #4DABF7)",
            value: fmtMinutes(today.minutes),
            sub: `${pctDelta(today.minutes, yesterday.minutes)} vs yesterday`,
        },
        {
            label: "XP Earned",
            icon: Zap,
            tint: "light-dark(#EBFBEE, #173128)",
            color: "light-dark(#2F9E44, #51CF66)",
            value: `${today.xp} XP`,
            sub: `${pctDelta(today.xp, yesterday.xp)} vs yesterday`,
        },
        {
            label: "Coins",
            icon: Coins,
            tint: "light-dark(#FFF4E6, #342417)",
            color: "light-dark(#E8590C, #FFA94D)",
            value: (profile?.student_coins ?? 0).toLocaleString(),
            sub: `+${today.coins} earned today`,
        },
        {
            label: "Day Streak",
            icon: Flame,
            tint: "light-dark(#FFF0F6, #331B26)",
            color: "light-dark(#E64980, #F783AC)",
            value: `${streakData?.current_streak ?? 0}`,
            sub: `Best: ${streakData?.longest_streak ?? 0} days`,
        },
    ];

    const upNextBlock = (nextBlock ?? null) as ScheduleBlockWithQuest | null;
    const upNextTitle = upNextBlock?.quests?.title ?? nextQuest?.title ?? null;

    return (
        <Box style={{ backgroundColor: "light-dark(#F7F9FC, #000000)", minHeight: "100vh" }}>
            <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                {/* modal for welcome reward */}
                {showReward && <WelcomeRewardModal />}

                {/* modal for tutorial */}
                {showTutorial && <TutorialModal />}

                {/* Header */}
                <Group justify="space-between" align="flex-end" mb={28} wrap="wrap">
                    <Box>
                        <Text c='dimmed' fz='sm' tt='uppercase' fw={500} lts={1.2}>
                            {now.toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </Text>
                        <Title order={1} mt={4} fw={800}>
                            {greeting}, {profile?.display_name || "Student"}!
                        </Title>
                    </Box>
                    <StreakBadge initialStreak={streakData?.current_streak ?? 0} />
                </Group>

                <WorkloadStatusChip />

                {/* stat cards */}
                <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md" mb={28} mt={28}>
                    {statCards.map((stat) => (
                        <Paper key={stat.label} p="lg" radius="lg" shadow="sm" withBorder>
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <Box>
                                    <Text c="dimmed" fz="sm" fw={600}>
                                        {stat.label}
                                    </Text>
                                    <Text fz={28} fw={800} mt={2}>
                                        {stat.value}
                                    </Text>
                                    <Text c="dimmed" fz="xs" mt={2}>
                                        {stat.sub}
                                    </Text>
                                </Box>
                                <ThemeIcon radius="xl" size={44} style={{ backgroundColor: stat.tint }} variant="light">
                                    <stat.icon size={22} style={{ color: stat.color }} />
                                </ThemeIcon>
                            </Group>
                        </Paper>
                    ))}
                </SimpleGrid>

                <DailyRewards />

                {/* Main Content */}
                <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb={28}>
                    <Stack gap='md' style={{ gridColumn: 'span 2' }}>
                        <QuestPanel />

                        {/* Weekly Focus */}
                        <Paper p='lg' radius='lg' shadow='sm' withBorder>
                            <Group justify='space-between' mb='md'>
                                <Group gap={8}>
                                    <ThemeIcon radius='lg' variant='light' color='indigo' size={32}>
                                        <TrendingUp size={18} />
                                    </ThemeIcon>
                                    <Title order={3} fz='lg' fw={700}>
                                        Weekly Focus
                                    </Title>
                                </Group>
                                <Text c='dimmed' fz='sm' fw={600}>
                                    {fmtMinutes(weekTotal)} total
                                </Text>
                            </Group>

                            <Flex align="flex-end" gap='xs' h={140}>
                                {days.map((d) => {
                                    const pct = Math.max(4, Math.round((d.minutes / maxDay) * 100));
                                    return (
                                        <Tooltip
                                            key={d.date.toISOString()}
                                            label={d.minutes > 0 ? `${fmtMinutes(d.minutes)} focused` : "No sessions"}
                                        >
                                            <Box
                                                style={{
                                                    flex: 1,
                                                    height: "100%",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 4,
                                                }}
                                            >
                                                <Box style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                                                    <Box
                                                        style={{
                                                            width: "100%",
                                                            height: `${d.minutes > 0 ? pct : 4}%`,
                                                            borderRadius: 8,
                                                            backgroundColor: d.minutes > 0 ? "#748FFC" : "light-dark(#E9ECEF, #2C2E33)",
                                                        }}
                                                    />
                                                </Box>
                                                <Text fz='xs' c='dimmed' ta='center' fw={600}>
                                                    {SHORT_DAYS[d.date.getDay()]}
                                                </Text>
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                            </Flex>
                        </Paper>
                    </Stack>

                    {/* Pet + session + actions */}
                    <Stack gap='md'>
                        {/* pet companion */}
                        <Paper p='lg' radius='lg' shadow='sm' withBorder style={{ position: "relative", overflow: "hidden" }}>
                            <Flex justify='space-between' align='center' mb={6}>
                                <Box>
                                    <Text fz='xs' c='dimmed' tt='uppercase' fw={700} lts={1}>
                                        Pet Companion
                                    </Text>
                                    <Title order={3} fz='lg' fw={800} mt={2}>
                                        {pet?.name || "No Pet"}
                                    </Title>
                                    <Badge variant='light' color='teal' mt={4}>
                                        Level {pet?.level || 0} • {getPetGrowth(pet?.level ?? 1).stage}
                                    </Badge>
                                </Box>
                                <Box
                                    w={100}
                                    h={100}
                                    style={{
                                        borderRadius: 24,
                                        background: "linear-gradient(135deg, light-dark(#D3F9D8, #173128), light-dark(#EBFBEE, #10241C))",
                                        display: 'grid',
                                        placeItems: 'center',
                                    }}
                                >
                                    {pet?.species && (
                                        <Image
                                            src={`/assets/starter-pets/${pet.species}.png`}
                                            alt={pet.name}
                                        />
                                    )}
                                </Box>
                            </Flex>
                            <Group justify='space-between' mt={10} mb={6}>
                                <Text fz='sm' fw={600}>
                                    Energy
                                </Text>
                                <Text fz='sm' fw={700} c='green'>
                                    {petEnergy}%
                                </Text>
                            </Group>
                            <Progress value={petEnergy} size='lg' radius='xl' color='teal' mb='md' />
                            <CustomButton>Visit Garden</CustomButton>
                        </Paper>

                        {/* up next or focus session */}
                        <Paper p='lg' radius='lg' shadow='sm' withBorder>
                            <Group gap={8} mb='md'>
                                <ThemeIcon radius='lg' variant='light' color='violet' size={32}>
                                    <BookOpen size={18} />
                                </ThemeIcon>
                                <Title order={3} fz='lg' fw={700}>
                                    Up Next
                                </Title>
                            </Group>
                            {upNextTitle ? (
                                <Box>
                                    <Text fz='md' fw={700}>
                                        {upNextTitle}
                                    </Text>
                                    <Text c='dimmed' fz='sm' mt={2}>
                                        {upNextBlock
                                            ? `${fmtTime(upNextBlock.starts_at)} – ${fmtTime(upNextBlock.ends_at)}`
                                            : nextQuest?.deadline
                                                ? `No scheduled block yet, due ${new Date(nextQuest.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                                                : "No scheduled block yet"}
                                    </Text>
                                </Box>
                            ) : (
                                <Text c='dimmed' fz='sm'>
                                    Nothing scheduled. Add a quest and generate a schedule to see it here.
                                </Text>
                            )}
                        </Paper>
                    </Stack>
                </SimpleGrid>
            </Box>
        </Box >
    );
}