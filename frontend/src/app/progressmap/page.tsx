import { getPetGrowth, getXpProgress, max_level, xp_per_level } from "@/components/petgrowth";
import StreakBadge from "@/components/streak-badge";
import { recordDailyStreak } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";
import { Badge, Box, Flex, Group, Image, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { BookOpen, CalendarClock, Check, Clock, Coins, Flame, Medal, Sparkles, Sun, Target, TrendingUp, Zap } from "lucide-react";
import type { ReactNode } from "react";

type Quest = {
    id: string;
    title: string;
    subject: string | null;
    status: string;
    completed_at: string | null;
    deadline: string | null;
    reward_coins: number | null;
};

type FocusSession = {
    started_at: string | null;
    duration_min: number | null;
    streak_xp_earned: number | null;
    coins_earned: number | null;
};

type SessionRow = {
    at: Date;
    minutes: number;
    xp: number;
    coins: number;
};

type SubjectStat = {
    name: string;
    total: number;
    completed: number;
    pending: number;
    overdue: number;
};

type Bar = {
    label: string;
    value: number;
};

const DAY_MS = 86_400_000;
const HEAT_WEEKS = 12;
const CHART_WEEKS = 8;
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SUBJECT_COLORS = ["#4C6EF5", "#12B886", "#F59F00", "#E64980", "#7950F2", "#15AABF", "#FA5252", "#82C91E"];
const STUDY_WINDOWS = [
    { name: "Morning", range: "5 AM – 12 PM" },
    { name: "Afternoon", range: "12 – 5 PM" },
    { name: "Evening", range: "5 – 10 PM" },
    { name: "Late Night", range: "10 PM – 5 AM" },
];
const STAGES = [
    { name: "Baby", from: 1, to: 5 },
    { name: "Young", from: 6, to: 10 },
    { name: "Junior", from: 11, to: 15 },
    { name: "Adult", from: 16, to: 20 },
    { name: "Mature", from: 21, to: max_level },
];
const HEAT_LEGEND = [0, 20, 45, 90, 150];

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function startOfWeek(date: Date): Date {
    const day = startOfDay(date);
    return addDays(day, -((day.getDay() + 6) % 7));
}

function weekIndex(date: Date, weekStart: Date): number {
    const days = Math.round((startOfDay(date).getTime() - weekStart.getTime()) / DAY_MS);
    return Math.floor(days / 7);
}

function fmtMinutes(total: number): string {
    const min = Math.round(total);
    if (min <= 0) return "0m";
    const hours = Math.floor(min / 60);
    const minutes = min % 60;
    if (hours === 0) return `${minutes}m`;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function heatColor(minutes: number): string {
    if (minutes <= 0) return "light-dark(#EBEDF0, #21262D)";
    if (minutes < 30) return "light-dark(#D3F9D8, #0E4429)";
    if (minutes < 60) return "light-dark(#8CE99A, #006D32)";
    if (minutes < 120) return "light-dark(#40C057, #26A641)";
    return "light-dark(#2B8A3E, #39D353)";
}

function SectionHead({ icon: Icon, color, children }: { icon: typeof Clock; color: string; children: ReactNode }) {
    return (
        <Group gap={8}>
            <ThemeIcon radius="lg" variant="light" color={color} size={32}>
                <Icon size={18} />
            </ThemeIcon>
            <Title order={3} fz="lg" fw={700}>
                {children}
            </Title>
        </Group>
    );
}

function WeeklyBars({ bars, color, format }: { bars: Bar[]; color: string; format: (value: number) => string }) {
    const max = Math.max(...bars.map((bar) => bar.value), 1);
    return (
        <Flex align="flex-end" gap="xs" h={160}>
            {bars.map((bar, index) => {
                const current = index === bars.length - 1;
                const height = Math.max(4, Math.round((bar.value / max) * 100));
                return (
                    <Tooltip key={bar.label} label={format(bar.value)} withArrow>
                        <Box style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
                            <Box style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                                <Box
                                    style={{
                                        width: "100%",
                                        height: `${bar.value > 0 ? height : 4}%`,
                                        borderRadius: 8,
                                        backgroundColor: bar.value > 0 ? color : "light-dark(#E9ECEF, #2C2E33)",
                                        opacity: current || bar.value === 0 ? 1 : 0.65,
                                    }}
                                />
                            </Box>
                            <Text
                                fz="xs"
                                c={current ? undefined : "dimmed"}
                                fw={current ? 700 : 600}
                                ta="center"
                                style={{ whiteSpace: "nowrap" }}
                            >
                                {bar.label}
                            </Text>
                        </Box>
                    </Tooltip>
                );
            })}
        </Flex>
    );
}

function HabitRow({ icon: Icon, tint, label, value }: { icon: typeof Clock; tint: string; label: string; value: string }) {
    return (
        <Group gap="sm" wrap="nowrap" align="center">
            <ThemeIcon radius="xl" variant="light" color="gray" size={33} style={{ backgroundColor: tint }}>
                <Icon size={16} style={{ color: "light-dark(#495057, #CED4DA)" }} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
                <Text fz="xs" c="dimmed" fw={600} tt="uppercase" lts={0.8}>
                    {label}
                </Text>
                <Text size="sm" fw={600} mt={1}>
                    {value}
                </Text>
            </Box>
        </Group>
    );
}

export default async function ProgressMapPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [profileRes, petRes, streakRes, questsRes, sessionsRes] = await Promise.all([
        supabase
            .from("profiles")
            .select("display_name, created_at, subjects, study_time")
            .eq("id", user.id)
            .maybeSingle(),
        supabase.from("pets").select("species, name, level, xp").eq("owner_id", user.id).maybeSingle(),
        recordDailyStreak(supabase, user.id),
        supabase
            .from("quests")
            .select("id, title, subject, status, completed_at, deadline, reward_coins")
            .eq("user_id", user.id),
        supabase
            .from("focus_sessions")
            .select("started_at, duration_min, streak_xp_earned, coins_earned")
            .eq("user_id", user.id),
    ]);

    const profile = profileRes.data;
    const pet = petRes.data;
    const streak = streakRes.data;
    const questRows = (questsRes.data ?? []) as Quest[];
    const sessionRows: SessionRow[] = ((sessionsRes.data ?? []) as FocusSession[])
        .filter((session) => session.started_at && session.duration_min && session.duration_min > 0)
        .map((session) => ({
            at: new Date(session.started_at as string),
            minutes: session.duration_min as number,
            xp: session.streak_xp_earned ?? 0,
            coins: session.coins_earned ?? 0,
        }));

    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now);

    const completedQuests = questRows.filter((quest) => quest.status === "completed");
    const completionRate = questRows.length > 0 ? Math.round((completedQuests.length / questRows.length) * 100) : 0;
    const totalMinutes = sessionRows.reduce((sum, session) => sum + session.minutes, 0);
    const focusXp = sessionRows.reduce((sum, session) => sum + session.xp, 0);
    const focusCoins = sessionRows.reduce((sum, session) => sum + session.coins, 0);
    const questCoins = completedQuests.reduce((sum, quest) => sum + (quest.reward_coins ?? 0), 0);
    const coinsEarned = focusCoins + questCoins;
    const averageSession = sessionRows.length > 0 ? totalMinutes / sessionRows.length : 0;
    const longestSession = sessionRows.reduce((max, session) => Math.max(max, session.minutes), 0);

    const last30Start = addDays(today, -29);
    const sessionsLast30 = sessionRows.filter((session) => session.at >= last30Start);
    const minutesLast30 = sessionsLast30.reduce((sum, session) => sum + session.minutes, 0);
    const activeDays = new Set(sessionsLast30.map((session) => startOfDay(session.at).getTime())).size;

    const completedWithDeadline = completedQuests.filter((quest) => quest.deadline);
    const onTimeCount = completedWithDeadline.filter(
        (quest) => quest.completed_at && new Date(quest.completed_at).getTime() <= new Date(quest.deadline as string).getTime()
    ).length;
    const timedCompletions = completedWithDeadline.filter((quest) => quest.completed_at).length;
    const untimedCompletions = completedWithDeadline.length - timedCompletions;
    let onTimeValue = "No deadlines yet";
    if (timedCompletions > 0) {
        const percent = Math.round((onTimeCount / timedCompletions) * 100);
        onTimeValue = `${onTimeCount} of ${timedCompletions} (${percent}%)`;
        if (untimedCompletions > 0) onTimeValue += ` • ${untimedCompletions} completion time not recorded`;
    } else if (untimedCompletions > 0) {
        onTimeValue = `${untimedCompletions} completed • completion time not recorded`;
    }

    const weekdayMinutes = [0, 0, 0, 0, 0, 0, 0];
    const windowMinutes = [0, 0, 0, 0];
    for (const session of sessionRows) {
        weekdayMinutes[session.at.getDay()] += session.minutes;
        const hour = session.at.getHours();
        if (hour >= 5 && hour < 12) windowMinutes[0] += session.minutes;
        else if (hour >= 12 && hour < 17) windowMinutes[1] += session.minutes;
        else if (hour >= 17 && hour < 22) windowMinutes[2] += session.minutes;
        else windowMinutes[3] += session.minutes;
    }
    const bestWeekdayTotal = Math.max(...weekdayMinutes);
    const bestWeekday = bestWeekdayTotal > 0 ? LONG_DAYS[weekdayMinutes.indexOf(bestWeekdayTotal)] : null;
    const bestWindowTotal = Math.max(...windowMinutes);
    const bestWindow = bestWindowTotal > 0 ? STUDY_WINDOWS[windowMinutes.indexOf(bestWindowTotal)] : null;

    let habitSummary = "Run a focus session in the Focus Room to unlock habit insights.";
    if (sessionRows.length > 0) {
        const parts = [bestWeekday ? `You study most on ${bestWeekday}s` : "You are building a study rhythm"];
        if (bestWindow) parts.push(`usually in the ${bestWindow.name.toLowerCase()}`);
        habitSummary = `${parts.join(", ")}. Average session: ${fmtMinutes(averageSession)} across ${sessionRows.length} session${sessionRows.length === 1 ? "" : "s"
            }.`;
    }

    const heatStart = addDays(weekStart, -(HEAT_WEEKS - 1) * 7);
    const heatDays = Array.from({ length: HEAT_WEEKS * 7 }, (_, index) => {
        const date = addDays(heatStart, index);
        return { date, minutes: 0, future: date.getTime() > today.getTime() };
    });
    const heatIndex = new Map(heatDays.map((day, index) => [day.date.getTime(), index]));
    for (const session of sessionRows) {
        const index = heatIndex.get(startOfDay(session.at).getTime());
        if (index !== undefined) heatDays[index].minutes += session.minutes;
    }
    const heatTotal = heatDays.reduce((sum, day) => sum + day.minutes, 0);
    const heatColumns = Array.from({ length: HEAT_WEEKS }, (_, week) => heatDays.slice(week * 7, week * 7 + 7));

    const chartStart = addDays(weekStart, -(CHART_WEEKS - 1) * 7);
    const focusByWeek = new Array<number>(CHART_WEEKS).fill(0);
    const questsByWeek = new Array<number>(CHART_WEEKS).fill(0);
    for (const session of sessionRows) {
        const index = weekIndex(session.at, chartStart);
        if (index >= 0 && index < CHART_WEEKS) focusByWeek[index] += session.minutes;
    }
    for (const quest of completedQuests) {
        if (!quest.completed_at) continue;
        const index = weekIndex(new Date(quest.completed_at), chartStart);
        if (index >= 0 && index < CHART_WEEKS) questsByWeek[index] += 1;
    }
    const chartWeeks = Array.from({ length: CHART_WEEKS }, (_, index) => addDays(chartStart, index * 7));
    const focusBars: Bar[] = chartWeeks.map((week, index) => ({
        label: week.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        value: focusByWeek[index],
    }));
    const questBars: Bar[] = chartWeeks.map((week, index) => ({
        label: week.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        value: questsByWeek[index],
    }));

    const subjectMap = new Map<string, SubjectStat>();
    const subjectStat = (name: string) => {
        const existing = subjectMap.get(name);
        if (existing) return existing;
        const created: SubjectStat = { name, total: 0, completed: 0, pending: 0, overdue: 0 };
        subjectMap.set(name, created);
        return created;
    };
    const profileSubjects = Array.isArray(profile?.subjects) ? (profile.subjects as string[]) : [];
    for (const subject of profileSubjects) {
        if (typeof subject === "string" && subject.trim()) subjectStat(subject.trim());
    }
    const preferredStudyPeriod = typeof profile?.study_time === "string" ? profile.study_time : null;
    for (const quest of questRows) {
        const stat = subjectStat(quest.subject?.trim() || "General");
        stat.total += 1;
        if (quest.status === "completed") {
            stat.completed += 1;
        } else {
            stat.pending += 1;
            if (quest.deadline && new Date(quest.deadline).getTime() < today.getTime()) stat.overdue += 1;
        }
    }
    const subjectStats = [...subjectMap.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    const petLevel = pet?.level ?? 1;
    const growth = getPetGrowth(petLevel);
    const currentStageIndex = Math.max(
        0,
        STAGES.findIndex((stage) => petLevel >= stage.from && petLevel <= stage.to)
    );
    const nextStage = STAGES.find((stage) => petLevel < stage.from);

    const statCards = [
        {
            label: "Quests Completed",
            icon: Target,
            tint: "light-dark(#EBFBEE, #173128)",
            color: "light-dark(#2F9E44, #51CF66)",
            value: `${completedQuests.length}`,
            sub: questRows.length > 0 ? `${completionRate}% completion rate` : "No quests yet",
        },
        {
            label: "Focus Time",
            icon: Clock,
            tint: "light-dark(#E7F5FF, #1B2A3A)",
            color: "light-dark(#1C7ED6, #4DABF7)",
            value: fmtMinutes(totalMinutes),
            sub: `${fmtMinutes(minutesLast30)} in the last 30 days`,
        },
        {
            label: "Current Streak",
            icon: Flame,
            tint: "light-dark(#FFF0F6, #331B26)",
            color: "light-dark(#E64980, #F783AC)",
            value: `${streak?.current_streak ?? 0} days`,
            sub: `Best: ${streak?.longest_streak ?? 0} days`,
        },
        {
            label: "Focus XP",
            icon: Zap,
            tint: "light-dark(#FFF4E6, #342417)",
            color: "light-dark(#E8590C, #FFA94D)",
            value: `${focusXp} XP`,
            sub: `${coinsEarned.toLocaleString()} coins earned`,
        },
    ];

    const habitRows = [
        {
            icon: Clock,
            tint: "light-dark(#E7F5FF, #1B2A3A)",
            label: "Average session",
            value: sessionRows.length > 0 ? `${fmtMinutes(averageSession)} per session` : "No sessions yet",
        },
        {
            icon: CalendarClock,
            tint: "light-dark(#DFF8EA, #173128)",
            label: "Most active day",
            value: bestWeekday ?? "Not enough data yet",
        },
        {
            icon: Sun,
            tint: "light-dark(#FFF9DB, #332D13)",
            label: "Peak study window",
            value: bestWindow ? `${bestWindow.name} (${bestWindow.range})` : "Not enough data yet",
        },
        {
            icon: TrendingUp,
            tint: "light-dark(#F3F0FF, #241F3D)",
            label: "Active days (last 30)",
            value: `${activeDays} of 30 days`,
        },
        {
            icon: Target,
            tint: "light-dark(#EBFBEE, #173128)",
            label: "Quests finished on time",
            value: onTimeValue,
        },
        {
            icon: Coins,
            tint: "light-dark(#FFF4E6, #342417)",
            label: "Coins earned",
            value: coinsEarned.toLocaleString(),
        },
        {
            icon: Medal,
            tint: "light-dark(#FFF0F6, #331B26)",
            label: "Longest session",
            value: sessionRows.length > 0 ? fmtMinutes(longestSession) : "No sessions yet",
        },
        {
            icon: Sparkles,
            tint: "light-dark(#E6FCF5, #15302C)",
            label: "Preferred study period",
            value: preferredStudyPeriod ?? "Not set",
        },
    ];

    const hasActivity = questRows.length > 0 || sessionRows.length > 0;

    return (
        <Box style={{ backgroundColor: "light-dark(#F7F9FC, #000000)", minHeight: "100vh" }}>
            <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                <Group justify="space-between" align="flex-end" mb={28} wrap="wrap">
                    <Box>
                        <Text c="dimmed" fz="sm" tt="uppercase" fw={500} lts={1.2}>
                            Your learning journey
                        </Text>
                        <Title order={1} mt={4} fw={800}>
                            Progress Map
                        </Title>
                        <Text c="dimmed" fz="sm" mt={4}>
                            {profile?.display_name ? `${profile.display_name} • ` : ""}
                            Tracking since{" "}
                            {new Date(profile?.created_at ?? now.toISOString()).toLocaleDateString(undefined, {
                                month: "long",
                                year: "numeric",
                            })}
                        </Text>
                    </Box>
                    <Group gap={8}>
                        {pet && (
                            <Badge size="lg" radius="xl" variant="light" color="teal">
                                {pet.name} • Level {pet.level} • {growth.stage}
                            </Badge>
                        )}
                        <StreakBadge initialStreak={streak?.current_streak ?? 0} />
                    </Group>
                </Group>

                {!hasActivity && (
                    <Paper p="lg" radius="lg" shadow="sm" withBorder mb={28}>
                        <Group gap="md" wrap="nowrap" align="flex-start">
                            <ThemeIcon radius="xl" variant="light" color="blue" size={44}>
                                <Sparkles size={22} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={700}>Your map is ready to grow</Text>
                                <Text c="dimmed" fz="sm" mt={2}>
                                    Add quests in the Quest Calendar and run sessions in the Focus Room. Completed quests, focus
                                    minutes, subject progress, and study habits will appear here automatically.
                                </Text>
                            </Box>
                        </Group>
                    </Paper>
                )}

                {/* stats */}
                <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md" mb={28}>
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

                {/* pet journey */}
                <Paper p="lg" radius="lg" shadow="sm" withBorder mb={28}>
                    <Group justify="space-between" mb="lg" wrap="wrap">
                        <SectionHead icon={Sparkles} color="teal">
                            Companion Journey
                        </SectionHead>
                        {pet && (
                            <Text c="dimmed" fz="sm" fw={600}>
                                Level {pet.level} of {max_level}
                            </Text>
                        )}
                    </Group>
                    {pet ? (
                        <Group align="center" wrap="nowrap" gap="xl">
                            <Box
                                w={110}
                                h={110}
                                style={{
                                    borderRadius: 28,
                                    backgroundColor: "light-dark(#EBFBEE, #15302C)",
                                    display: "grid",
                                    placeItems: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <Image src={`/assets/starter-pets/${pet.species}.png`} alt={pet.name} w={90} h={90} fit="contain" />
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <Group justify="space-between" mb={6}>
                                    <Text fz="sm" fw={600}>
                                        {nextStage ? `Next stage: ${nextStage.name} at level ${nextStage.from}` : "Fully grown companion"}
                                    </Text>
                                    <Text fz="sm" fw={700} c="teal">
                                        {pet.xp ?? 0}/{xp_per_level} XP
                                    </Text>
                                </Group>
                                <Progress value={getXpProgress(pet.xp ?? 0)} color="teal" size="lg" radius="xl" mb="lg" />
                                <SimpleGrid cols={5} spacing="xs">
                                    {STAGES.map((stage, index) => {
                                        const done = petLevel > stage.to || (stage.to === max_level && petLevel >= max_level);
                                        const current = !done && index === currentStageIndex;
                                        return (
                                            <Stack key={stage.name} gap={4} align="center">
                                                <Box
                                                    w={30}
                                                    h={30}
                                                    style={{
                                                        borderRadius: "50%",
                                                        display: "grid",
                                                        placeItems: "center",
                                                        backgroundColor: done ? "#12B886" : current ? "light-dark(#E6FCF5, #15302C)" : "light-dark(#F1F3F5, #2C2E33)",
                                                        border: current ? "2px solid #12B886" : "2px solid transparent",
                                                    }}
                                                >
                                                    {done ? (
                                                        <Check size={14} color="#FFFFFF" />
                                                    ) : (
                                                        <Text fz="xs" fw={700} c={current ? "teal" : "dimmed"}>
                                                            {index + 1}
                                                        </Text>
                                                    )}
                                                </Box>
                                                <Text fz="xs" fw={current ? 700 : 500} c={current ? "teal" : "dimmed"} ta="center">
                                                    {stage.name}
                                                </Text>
                                                <Text fz={10} c="dimmed" ta="center">
                                                    Lv {stage.from}–{stage.to}
                                                </Text>
                                            </Stack>
                                        );
                                    })}
                                </SimpleGrid>
                            </Box>
                        </Group>
                    ) : (
                        <Text c="dimmed" fz="sm">
                            No companion yet — pick one in the Pet Garden to start your journey.
                        </Text>
                    )}
                </Paper>

                {/* focus activity section */}
                <Paper p="lg" radius="lg" shadow="sm" withBorder mb={28}>
                    <Group justify="space-between" mb="md" wrap="wrap">
                        <SectionHead icon={CalendarClock} color="green">
                            Focus Activity
                        </SectionHead>
                        <Group gap={6}>
                            <Text fz="xs" c="dimmed">
                                Less
                            </Text>
                            {HEAT_LEGEND.map((minutes) => (
                                <Box
                                    key={minutes}
                                    w={14}
                                    h={14}
                                    style={{ borderRadius: 4, backgroundColor: heatColor(minutes) }}
                                />
                            ))}
                            <Text fz="xs" c="dimmed">
                                More
                            </Text>
                        </Group>
                    </Group>
                    <Text fz="sm" c="dimmed" fw={600} mb="md">
                        {fmtMinutes(heatTotal)} focused in the last {HEAT_WEEKS} weeks
                    </Text>
                    <Box style={{ overflowX: "auto", paddingBottom: 4 }}>
                        <Flex gap={6} w="fit-content">
                            <Stack gap={11} mr={2}>
                                <Box h={18} />
                                {["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"].map((label, index) => (
                                    <Text key={index} fz={12} c="dimmed" h={16} lh="16px">
                                        {label}
                                    </Text>
                                ))}
                            </Stack>
                            {heatColumns.map((column, columnIndex) => {
                                const monday = column[0].date;
                                const previousMonday = columnIndex > 0 ? heatColumns[columnIndex - 1][0].date : null;
                                const showMonth = !previousMonday || monday.getMonth() !== previousMonday.getMonth();
                                return (
                                    <Stack key={columnIndex} gap={3}>
                                        <Text fz={10} c="dimmed" h={18} lh="18px" style={{ whiteSpace: "nowrap" }}>
                                            {showMonth ? monday.toLocaleDateString(undefined, { month: "short" }) : ""}
                                        </Text>
                                        {column.map((day) =>
                                            day.future ? (
                                                <Box
                                                    key={day.date.getTime()}
                                                    w={26}
                                                    h={26}
                                                    style={{ borderRadius: 4, backgroundColor: "transparent" }}
                                                />
                                            ) : (
                                                <Tooltip
                                                    key={day.date.getTime()}
                                                    withArrow
                                                    label={`${day.date.toLocaleDateString(undefined, {
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                    })} • ${day.minutes > 0 ? `${fmtMinutes(day.minutes)} focused` : "No focus"}`}
                                                >
                                                    <Box
                                                        w={26}
                                                        h={26}
                                                        style={{ borderRadius: 4, backgroundColor: heatColor(day.minutes) }}
                                                    />
                                                </Tooltip>
                                            )
                                        )}
                                    </Stack>
                                );
                            })}
                        </Flex>
                    </Box>
                </Paper>

                {/* weekly focus & quests */}
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mb={28}>
                    <Paper p="lg" radius="lg" shadow="sm" withBorder>
                        <Group justify="space-between" mb="md" wrap="wrap">
                            <SectionHead icon={Clock} color="indigo">
                                Focus Time by Week
                            </SectionHead>
                            <Text fz="sm" fw={600} c="dimmed">
                                {fmtMinutes(totalMinutes)} total
                            </Text>
                        </Group>
                        <WeeklyBars
                            bars={focusBars}
                            color="#748FFC"
                            format={(value) => (value > 0 ? `${fmtMinutes(value)} focused` : "No sessions")}
                        />
                    </Paper>
                    <Paper p="lg" radius="lg" shadow="sm" withBorder>
                        <Group justify="space-between" mb="md" wrap="wrap">
                            <SectionHead icon={Target} color="green">
                                Quests Completed by Week
                            </SectionHead>
                            <Text fz="sm" fw={600} c="dimmed">
                                {completedQuests.length} total
                            </Text>
                        </Group>
                        <WeeklyBars
                            bars={questBars}
                            color="#51CF66"
                            format={(value) => (value > 0 ? `${value} quest${value === 1 ? "" : "s"} completed` : "None completed")}
                        />
                    </Paper>
                </SimpleGrid>

                {/* subject breakdown & study habits */}
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                    <Paper p="lg" radius="lg" shadow="sm" withBorder>
                        <Group justify="space-between" mb="lg" wrap="wrap">
                            <SectionHead icon={BookOpen} color="blue">
                                Subject Breakdown
                            </SectionHead>
                            <Text fz="sm" fw={600} c="dimmed">
                                {subjectStats.length} subject{subjectStats.length === 1 ? "" : "s"}
                            </Text>
                        </Group>
                        {subjectStats.length === 0 ? (
                            <Text c="dimmed" fz="sm">
                                No subjects yet — subjects come from your academic profile and the quests you add.
                            </Text>
                        ) : (
                            <Stack gap="md">
                                {subjectStats.map((subject, index) => {
                                    const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                                    const percent = subject.total > 0 ? Math.round((subject.completed / subject.total) * 100) : 0;
                                    return (
                                        <Box key={subject.name}>
                                            <Group justify="space-between" mb={6} wrap="nowrap">
                                                <Group gap={8} wrap="nowrap">
                                                    <Box
                                                        w={10}
                                                        h={10}
                                                        style={{ borderRadius: 3, backgroundColor: color, flexShrink: 0 }}
                                                    />
                                                    <Text fz="sm" fw={600}>
                                                        {subject.name}
                                                    </Text>
                                                </Group>
                                                <Text fz="xs" c="dimmed" fw={600}>
                                                    {subject.total > 0
                                                        ? `${subject.completed}/${subject.total} completed • ${percent}%`
                                                        : "No quests yet"}
                                                </Text>
                                            </Group>
                                            <Progress value={percent} color={color} radius="xl" size="md" />
                                            <Group justify="space-between" mt={4}>
                                                <Text fz="xs" c="dimmed">
                                                    {subject.total > 0
                                                        ? `${subject.pending} pending${subject.overdue > 0 ? ` • ${subject.overdue} overdue` : ""}`
                                                        : "Add a quest to start tracking"}
                                                </Text>
                                                {subject.overdue > 0 && (
                                                    <Text fz="xs" c="red" fw={600}>
                                                        Needs attention
                                                    </Text>
                                                )}
                                            </Group>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </Paper>

                    <Paper p="lg" radius="lg" shadow="sm" withBorder>
                        <Group gap={8} mb="md">
                            <SectionHead icon={Medal} color="violet">
                                Study Habits
                            </SectionHead>
                        </Group>
                        <Text fz="sm" c="dimmed" mb="lg">
                            {habitSummary}
                        </Text>
                        <Stack gap="sm">
                            {habitRows.map((habit) => (
                                <HabitRow
                                    key={habit.label}
                                    icon={habit.icon}
                                    tint={habit.tint}
                                    label={habit.label}
                                    value={habit.value}
                                />
                            ))}
                        </Stack>
                    </Paper>
                </SimpleGrid>
            </Box>
        </Box>
    );
}
