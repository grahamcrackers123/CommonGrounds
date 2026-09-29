"use client";

import { createClient } from "@/lib/supabase/client";
import { Badge, Box, Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { Bell, BellOff, Check, CheckCheck, HeartHandshake, Megaphone, Sparkles, Timer, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type NotificationType = "friend_request" | "quest_deadline" | "risk_flag" | "room_invite" | "session_completed"

interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    createdAt: string;
    unread: boolean;
}

const types: Record<NotificationType, { icon: typeof Bell; tint: string; color: string; label: string }> = {
    friend_request: { icon: UserPlus, tint: "#E3FAFC", color: "#0C8599", label: "Friend request" },
    quest_deadline: { icon: Timer, tint: "#FFEAEA", color: "#E03131", label: "Deadline reminder" },
    risk_flag: { icon: Megaphone, tint: "#FFF4E6", color: "#E8590C", label: "Workload check-in" },
    room_invite: { icon: Users, tint: "#EDF2FF", color: "#3B5BDB", label: "Focus room invite" },
    session_completed: { icon: Sparkles, tint: "#EBFBEE", color: "#2F9E44", label: "Session reward" },
};

type NotifFilter = "all" | "unread" | "deadline" | "reward" | "social";

export default function NotificationPage() {
    const supabase = createClient();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [filter, setFilter] = useState<NotifFilter>("all");

    const unreadCount = notifications.filter((n) => n.unread).length;
    const todayCount = notifications.filter((n) => new Date(n.createdAt).toDateString() === new Date().toDateString()).length;
    const deadlineCount = notifications.filter((n) => n.type === 'quest_deadline').length;
    const socialCount = notifications.filter((n) => n.type === 'friend_request' || n.type === 'room_invite').length;

    useEffect(() => {
        async function fetchNotifications() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id);

            if (error) console.error('Error fetching notifications:', error);
            else {
                const rows = (data ?? []).map((n) => ({
                    id: String(n.id),
                    type: n.type as NotificationType,
                    title: String(n.title ?? ""),
                    body: String(n.body ?? ""),
                    createdAt: String(n.created_at ?? ""),
                    unread: n.read === false,
                }));
                setNotifications(rows);
            }
        }
        fetchNotifications();
    }, [supabase]);

    const filteredNotifications = useMemo(() => {
        switch (filter) {
            case 'unread':
                return notifications.filter((n) => n.unread);
            case 'deadline':
                return notifications.filter((n) => n.type === 'quest_deadline');
            case 'reward':
                return notifications.filter((n) => n.type === 'session_completed');
            case 'social':
                return notifications.filter((n) => n.type === 'friend_request' || n.type === 'room_invite' || n.type === 'risk_flag');
            default:
                return notifications;
        }
    }, [filter, notifications]);

    const markRead = (id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
        fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }).catch(() => undefined);
    };

    const markAllRead = () => {
        const unread = notifications.filter((n) => n.unread);
        if (unread.length === 0) return;
        setNotifications((prev) => prev.map((n) => (n.unread ? { ...n, unread: false } : n)));
        unread.forEach((n) => {
            fetch(`/api/notifications/${encodeURIComponent(n.id)}/read`, { method: "POST" }).catch(() => undefined);
        });
    };

    const stats = [
        { label: "Unread", value: String(unreadCount), icon: Bell, tint: "#FFEAEA", color: "#E03131" },
        { label: "Received today", value: String(todayCount), icon: BellOff, tint: "#E7F5FF", color: "#1C7ED6" },
        { label: "Deadline reminders", value: String(deadlineCount), icon: Timer, tint: "#FFF4E6", color: "#E8590C" },
        { label: "Social & invites", value: String(socialCount), icon: HeartHandshake, tint: "#E3FAFC", color: "#0C8599" },
    ];

    const filters: { key: NotifFilter; label: string }[] = [
        { key: "all", label: "All" },
        { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        { key: "deadline", label: "Deadline reminders" },
        { key: "reward", label: "Rewards & streaks" },
        { key: "social", label: "Social & updates" },
    ];

    return (
        <Box style={{ backgroundColor: "#F8F9FA", minHeight: "100vh" }}>
            <Box maw={1000} mx="auto" p={{ base: 20, md: 40 }}>
                <Group justify='space-between' align='flex-end' mb={24} wrap='wrap'>
                    <Box>
                        <Title order={1} fw={800}>
                            Notifications
                        </Title>
                        <Text c='dimmed' size='sm' mt={4}>
                            Reminders, rewards, and updates from your study world.
                        </Text>
                    </Box>
                    <Button
                        variant='light'
                        color='green'
                        radius='lg'
                        leftSection={<CheckCheck size={16} />}
                        disabled={unreadCount === 0}
                        onClick={markAllRead}
                    >
                        Mark all read
                    </Button>
                </Group>

                {/* stats */}
                <SimpleGrid cols={{ base: 2, lg: 4 }} spacing='md' mb={24}>
                    {stats.map((stat) => (
                        <Paper key={stat.label} p='lg' radius='lg' shadow='sm' withBorder>
                            <Group justify='space-between' wrap='nowrap'>
                                <Box>
                                    <Text c='dimmed' fz='xs' fw={600} tt='uppercase' lts={1}>
                                        {stat.label}
                                    </Text>
                                    <Text fz={26} fw={800} mt={2}>
                                        {stat.value}
                                    </Text>
                                </Box>
                                <ThemeIcon radius='xl' size={40} variant='light' style={{ backgroundColor: stat.tint }}>
                                    <stat.icon size={18} style={{ color: stat.color }} />
                                </ThemeIcon>
                            </Group>
                        </Paper>
                    ))}
                </SimpleGrid>

                {/* filter chips */}
                <Group gap={8} mb='md'>
                    {filters.map((f) => {
                        const isActive = filter === f.key;
                        return (
                            <Badge
                                key={f.key}
                                size='lg'
                                radius='xl'
                                px={18}
                                py={10}
                                variant={isActive ? 'filled' : 'outline'}
                                color={isActive ? 'green' : 'gray'}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setFilter(f.key)}
                            >
                                {f.label}
                            </Badge>
                        );
                    })}
                </Group>

                {/* feed */}
                <Paper p='lg' radius='lg' shadow='sm' withBorder>
                    {filteredNotifications.length === 0 ? (
                        <Stack align='center' gap='sm' py='xl'>
                            <ThemeIcon radius='xl' size={56} variant='light' color='green'>
                                <Check size={26} />
                            </ThemeIcon>
                            <Text fw={700}>All caught up!</Text>
                            <Text c='dimmed' size='sm' ta='center'>
                                Nothing here right now. Keep studying and you&apos;ll see notifications when you have new reminders, rewards, or updates.
                            </Text>
                        </Stack>
                    ) : (
                        <Stack gap={4}>
                            {filteredNotifications.map((notification) => {
                                const meta = types[notification.type];
                                return (
                                    <Group
                                        key={notification.id}
                                        gap='sm'
                                        align='flex-start'
                                        wrap='nowrap'
                                        p='sm'
                                        style={{
                                            borderRadius: 12,
                                            backgroundColor: notification.unread ? '#F8F9FA' : 'transparent',
                                            border: notification.unread ? '1px solid #E9ECEF' : '1px solid transparent',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => markRead(notification.id)}
                                        role='button'
                                        aria-label={`${notification.title} - mark as read`}
                                    >
                                        <Box style={{ position: 'relative', flexShrink: 0 }}>
                                            <ThemeIcon radius='xl' size={40} variant='light' style={{ backgroundColor: meta.tint }}>
                                                <meta.icon size={18} style={{ color: meta.color }} />
                                            </ThemeIcon>
                                            {notification.unread && (
                                                <Box
                                                    w={10}
                                                    h={10}
                                                    style={{
                                                        borderRadius: 99,
                                                        backgroundColor: '#2F9E44',
                                                        position: 'absolute',
                                                        top: -2,
                                                        right: -2,
                                                        border: '2px solid #FFFFFF',
                                                    }}
                                                />
                                            )}

                                        </Box>

                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Group justify='space-between' gap='sm' wrap='nowrap'>
                                                <Text fw={700} size='sm' c={notification.unread ? "#212529" : "#495057"}>
                                                    {notification.title}
                                                </Text>
                                                <Text c='dimmed' fz='xs' mt={2}>
                                                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                                                </Text>
                                            </Group>
                                            <Text c='dimmed' fz='sm' mt={2} lineClamp={2}>
                                                {notification.body}
                                            </Text>
                                            <Badge variant='light' color={meta.color} size='xs' radius='sm' mt={6}>
                                                {meta.label}
                                            </Badge>
                                        </Box>
                                        {notification.unread ? (
                                            <ThemeIcon radius='xl' size={26} variant='light' color='green' style={{ flexShrink: 0 }}>
                                                <Check size={14} />
                                            </ThemeIcon>
                                        ) : null}
                                    </Group>
                                );
                            })}
                        </Stack>
                    )}
                </Paper>

                {/* quiet hours hint */}
                <Paper p='md' radius='lg' shadow='sm' withBorder mt='md'>
                    <Group gap={10} align='flex-start' wrap='nowrap'>
                        <ThemeIcon radius='xl' size={30} variant='light' color='indigo' style={{ alignSelf: 'center' }}>
                            <Megaphone size={16} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={700} size='sm'>
                                Too noisy?
                            </Text>
                            <Text c='dimmed' fz='xs' mt={2}>
                                You can tune exactly which notifications you want to receive in Settings: Notifications.
                            </Text>
                        </Box>
                    </Group>
                </Paper>
            </Box>
        </Box>
    );
}