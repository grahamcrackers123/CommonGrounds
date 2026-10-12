
"use client";

import { useState } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Group,
    Paper,
    SimpleGrid,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import {
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    Clock,
    Target,
    TrendingUp,
} from "lucide-react";

type FocusEntry = {
    date: string;
    minutes: number;
};

type QuestEntry = {
    date: string;
};

type Props = {
    focusEntries: FocusEntry[];
    questEntries: QuestEntry[];
    totalMinutes: number;
    totalCompletedQuests: number;
};

type ViewMode = "week" | "month";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
}

function formatMinutes(minutes: number) {
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function ProgressCalendar({
    focusEntries,
    questEntries,
    totalMinutes,
    totalCompletedQuests,
}: Props) {
    const [view, setView] = useState<ViewMode>("week");
    const [selectedDate, setSelectedDate] = useState(() => new Date());

    const focusByDay = new Map<string, number>();

    for (const entry of focusEntries) {
        focusByDay.set(
            entry.date,
            (focusByDay.get(entry.date) ?? 0) + entry.minutes
        );
    }

    const questsByDay = new Map<string, number>();

    for (const entry of questEntries) {
        questsByDay.set(
            entry.date,
            (questsByDay.get(entry.date) ?? 0) + 1
        );
    }

    const weekStart = startOfWeek(selectedDate);

    const weekDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const key = dateKey(date);

        return {
            date,
            key,
            minutes: focusByDay.get(key) ?? 0,
            quests: questsByDay.get(key) ?? 0,
        };
    });

    const monthStart = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
    );

    const monthEnd = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0
    );

    const leadingDays = (monthStart.getDay() + 6) % 7;

    const calendarStart = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        1 - leadingDays
    );

    const cellCount =
        Math.ceil((leadingDays + monthEnd.getDate()) / 7) * 7;

    const calendarDays = Array.from({ length: cellCount }, (_, index) => {
        const date = new Date(calendarStart);
        date.setDate(calendarStart.getDate() + index);

        const key = dateKey(date);

        return {
            date,
            key,
            inMonth: date.getMonth() === selectedDate.getMonth(),
            minutes: focusByDay.get(key) ?? 0,
            quests: questsByDay.get(key) ?? 0,
        };
    });

    const monthDays = calendarDays.filter((day) => day.inMonth);

    const monthlyFocusMinutes = monthDays.reduce(
        (sum, day) => sum + day.minutes,
        0
    );

    const monthlyQuests = monthDays.reduce(
        (sum, day) => sum + day.quests,
        0
    );

    const activeStudyDays = monthDays.filter(
        (day) => day.minutes > 0
    ).length;

    const averageFocusMinutes =
        activeStudyDays > 0
            ? Math.round(monthlyFocusMinutes / activeStudyDays)
            : 0;

    const weeklyFocusMinutes = weekDays.reduce(
        (sum, day) => sum + day.minutes,
        0
    );

    const weeklyQuests = weekDays.reduce(
        (sum, day) => sum + day.quests,
        0
    );

    function navigate(direction: -1 | 1) {
        setSelectedDate((current) => {
            if (view === "month") {
                return new Date(
                    current.getFullYear(),
                    current.getMonth() + direction,
                    1
                );
            }

            const next = new Date(current);
            next.setDate(next.getDate() + direction * 7);
            return next;
        });
    }

    const periodLabel =
        view === "month"
            ? selectedDate.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
              })
            : (() => {
                  const end = new Date(weekStart);
                  end.setDate(weekStart.getDate() + 6);

                  return `${weekStart.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                  })} – ${end.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                  })}`;
              })();

    const summaryCards = [
        {
            label: "Quests completed",
            value: String(monthlyQuests),
            description: "This month",
            color: "#2F9E44",
            icon: Target,
        },
        {
            label: "Total focus time",
            value: formatMinutes(monthlyFocusMinutes),
            description: "This month",
            color: "#1C7ED6",
            icon: Clock,
        },
        {
            label: "Active study days",
            value: String(activeStudyDays),
            description: "Days with focus sessions",
            color: "#7950F2",
            icon: CalendarCheck,
        },
        {
            label: "Average focus time",
            value: formatMinutes(averageFocusMinutes),
            description: "Per active study day",
            color: "#E8590C",
            icon: TrendingUp,
        },
    ];

    return (
        <Stack gap="md" mb={28}>
            <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs">
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        aria-label="Previous period"
                        onClick={() => navigate(-1)}
                    >
                        <ChevronLeft size={18} />
                    </ActionIcon>

                    <Text fw={700} miw={150} ta="center">
                        {periodLabel}
                    </Text>

                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        aria-label="Next period"
                        onClick={() => navigate(1)}
                    >
                        <ChevronRight size={18} />
                    </ActionIcon>
                </Group>

                <Group
                    gap={0}
                    style={{
                        border: "1px solid #D9DEE7",
                        borderRadius: 20,
                        overflow: "hidden",
                        background: "light-dark(#F3F4F6, #25262B)",
                    }}
                >
                    <Button
                        size="compact-sm"
                        radius={0}
                        variant={view === "week" ? "filled" : "subtle"}
                        color="blue"
                        onClick={() => setView("week")}
                    >
                        Week
                    </Button>

                    <Button
                        size="compact-sm"
                        radius={0}
                        variant={view === "month" ? "filled" : "subtle"}
                        color="blue"
                        onClick={() => setView("month")}
                    >
                        Month
                    </Button>
                </Group>
            </Group>

            {view === "week" ? (
                <Paper p="lg" radius="lg" shadow="sm" withBorder>
                    <Group justify="space-between" mb="md" wrap="wrap">
                        <Text fw={700}>Weekly Activity</Text>
                        <Text fz="sm" c="dimmed">
                            {formatMinutes(weeklyFocusMinutes)} focused ·{" "}
                            {weeklyQuests} quests completed
                        </Text>
                    </Group>

                    <SimpleGrid cols={7} spacing={6}>
                        {weekDays.map((day) => (
                            <Tooltip
                                key={day.key}
                                withArrow
                                label={`${day.date.toLocaleDateString(undefined, {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })} • ${formatMinutes(day.minutes)} focused • ${day.quests} completed quest${day.quests === 1 ? "" : "s"}`}
                            >
                                <Box
                                    p={{ base: 4, sm: 8 }}
                                    style={{
                                        minWidth: 0,
                                        minHeight: 100,
                                        borderRadius: 8,
                                        border: "1px solid",
                                        borderColor:
                                            "light-dark(#E9ECEF, #373A40)",
                                        backgroundColor:
                                            day.minutes > 0 || day.quests > 0
                                                ? "light-dark(#E7F5FF, #1B2A3A)"
                                                : "light-dark(#FFFFFF, #1A1B1E)",
                                    }}
                                >
                                    <Text
                                        fz="xs"
                                        c="dimmed"
                                        fw={600}
                                        ta="center"
                                    >
                                        {WEEKDAYS[
                                            (day.date.getDay() + 6) % 7
                                        ]}
                                    </Text>

                                    <Text
                                        fw={700}
                                        ta="center"
                                        mt={4}
                                        mb={8}
                                    >
                                        {day.date.getDate()}
                                    </Text>

                                    <Text
                                        fz={{ base: 10, sm: "xs" }}
                                        c="blue"
                                        fw={600}
                                        ta="center"
                                    >
                                        {day.minutes > 0
                                            ? formatMinutes(day.minutes)
                                            : "—"}
                                    </Text>

                                    {day.quests > 0 && (
                                        <Badge
                                            size="xs"
                                            variant="light"
                                            color="green"
                                            mt={4}
                                            fullWidth
                                        >
                                            {day.quests} quest
                                            {day.quests === 1 ? "" : "s"}
                                        </Badge>
                                    )}
                                </Box>
                            </Tooltip>
                        ))}
                    </SimpleGrid>

                    <Text fz="xs" c="dimmed" mt="md">
                        All-time totals: {formatMinutes(totalMinutes)} focused
                        and {totalCompletedQuests} quests completed.
                    </Text>
                </Paper>
            ) : (
                <>
                    <SimpleGrid
                        cols={{ base: 1, sm: 2, lg: 4 }}
                        spacing="md"
                    >
                        {summaryCards.map((card) => {
                            const Icon = card.icon;

                            return (
                                <Paper
                                    key={card.label}
                                    p="md"
                                    radius="lg"
                                    shadow="sm"
                                    withBorder
                                >
                                    <Group
                                        gap="xs"
                                        align="flex-start"
                                        wrap="nowrap"
                                    >
                                        <Box
                                            p={8}
                                            style={{
                                                borderRadius: 10,
                                                backgroundColor: `${card.color}18`,
                                                color: card.color,
                                            }}
                                        >
                                            <Icon size={20} />
                                        </Box>

                                        <Box style={{ minWidth: 0, flex: 1 }}>
                                            <Text
                                                fz="xs"
                                                c="dimmed"
                                                fw={600}
                                            >
                                                {card.label}
                                            </Text>

                                            <Text fw={800} fz="xl" mt={4}>
                                                {card.value}
                                            </Text>

                                            <Text fz="xs" c="dimmed" mt={2}>
                                                {card.description}
                                            </Text>
                                        </Box>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </SimpleGrid>

                    <Paper
                        p={{ base: "sm", sm: "lg" }}
                        radius="lg"
                        shadow="sm"
                        withBorder
                    >
                        <Group
                            justify="space-between"
                            mb="md"
                            wrap="wrap"
                        >
                            <Text fw={700}>Daily Activity</Text>
                            <Text fz="xs" c="dimmed">
                                Focus time and completed quests per day
                            </Text>
                        </Group>

                        <SimpleGrid cols={7} spacing={4} mb="xs">
                            {WEEKDAYS.map((day) => (
                                <Text
                                    key={day}
                                    ta="center"
                                    fz="xs"
                                    fw={700}
                                    c="dimmed"
                                >
                                    {day}
                                </Text>
                            ))}
                        </SimpleGrid>

                        <SimpleGrid cols={7} spacing={4}>
                            {calendarDays.map((day) => (
                                <Tooltip
                                    key={day.key}
                                    withArrow
                                    label={`${day.date.toLocaleDateString(undefined, {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })} • ${formatMinutes(day.minutes)} focused • ${day.quests} completed quest${day.quests === 1 ? "" : "s"}`}
                                >
                                    <Box
                                        p={{ base: 4, sm: 8 }}
                                        style={{
                                            minWidth: 0,
                                            minHeight: 82,
                                            borderRadius: 8,
                                            border: "1px solid",
                                            borderColor: day.inMonth
                                                ? "light-dark(#E9ECEF, #373A40)"
                                                : "light-dark(#F1F3F5, #25262B)",
                                            backgroundColor: day.inMonth
                                                ? day.minutes > 0 ||
                                                  day.quests > 0
                                                    ? "light-dark(#E7F5FF, #1B2A3A)"
                                                    : "light-dark(#FFFFFF, #1A1B1E)"
                                                : "light-dark(#F8F9FA, #141517)",
                                            opacity: day.inMonth ? 1 : 0.45,
                                        }}
                                    >
                                        <Text
                                            fz="sm"
                                            fw={700}
                                            mb={4}
                                            c={
                                                day.inMonth
                                                    ? undefined
                                                    : "dimmed"
                                            }
                                        >
                                            {day.date.getDate()}
                                        </Text>

                                        <Text
                                            fz={{ base: 10, sm: "xs" }}
                                            c={
                                                day.minutes > 0
                                                    ? "blue"
                                                    : "dimmed"
                                            }
                                            fw={day.minutes > 0 ? 600 : 400}
                                        >
                                            {day.minutes > 0
                                                ? formatMinutes(day.minutes)
                                                : "—"}
                                        </Text>

                                        {day.quests > 0 && (
                                            <Badge
                                                size="xs"
                                                variant="light"
                                                color="green"
                                                mt={4}
                                                style={{ maxWidth: "100%" }}
                                            >
                                                {day.quests} quest
                                                {day.quests === 1 ? "" : "s"}
                                            </Badge>
                                        )}
                                    </Box>
                                </Tooltip>
                            ))}
                        </SimpleGrid>
                    </Paper>
                </>
            )}
        </Stack>
    );
}
