"use client";

import { createClient } from '@/lib/supabase/client';
import { AppShell, Avatar, Badge, Burger, Flex, Group, Image, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Bell, Circle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface NotificationRow {
    id: number;
    unread: boolean;
    [key: string]: unknown;
}

function FillCircle({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <UnstyledButton onClick={onClick} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <Group gap="md" w="100%" style={{ backgroundColor: active ? '#EAF3FF' : 'transparent', padding: '8px 16px', borderRadius: '16px' }}>
                <Circle size={16} fill={active ? '#2F80ED' : 'none'} stroke={active ? '#2F80ED' : 'gray'} />
                <Text c={active ? '#2F80ED' : 'gray'} fw={active ? 'bold' : 400}>
                    {label}
                </Text>
            </Group>
        </UnstyledButton>
    );
}

const hideNavbar = ['/access', '/forgot-password', '/setup'];

export default function Navbar({ children }: { children: React.ReactNode }) {
    const supabase = useMemo(() => createClient(), []);
    const pathname = usePathname();
    const [opened, { toggle }] = useDisclosure(false);
    const router = useRouter();
    const [coins, setCoins] = useState<number | null>(null);
    const [notificationList, setNotificationList] = useState<NotificationRow[]>([]);
    const [profile, setProfile] = useState<{ display_name: string } | null>(null);
    const [pet, setPet] = useState<{ level: number } | null>(null);

    const navlinks = [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Ask Wasi", path: "/askwasi" },
        { label: "Quest Calendar", path: "/questcalendar" },
        { label: "Focus Room", path: "/focusroom" },
        { label: "Pet Garden", path: "/petgarden" },
        { label: "Reward Shop", path: "/rewardshop" },
        { label: "Progress Map", path: "/progressmap" },
        { label: "Settings", path: "/settings" },
    ];
    const allRoutes = [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Ask Wasi", path: "/askwasi" },
        { label: "Quest Calendar", path: "/questcalendar" },
        { label: "Focus Room", path: "/focusroom" },
        { label: "Pet Garden", path: "/petgarden" },
        { label: "Reward Shop", path: "/rewardshop" },
        { label: "Progress Map", path: "/progressmap" },
        { label: "Settings", path: "/settings" },
        { label: "Notification", path: "/notification" },
        { label: "Profile", path: "/profile" }
    ];

    const handleNavigation = (link: { label: string; path: string }) => {
        router.push(link.path);
    };

    useEffect(() => {
        if (hideNavbar.includes(pathname)) return;
        fetch('/api/rewards/balance')
            .then((res) => res.json())
            .then((data) => setCoins(data.coins ?? 0))
            .catch(() => {
                notifications.show({ title: 'Error', message: 'Could not load your coin balance.', color: 'red' });
            });
    }, [pathname]);

    const currentTitle = allRoutes.find(link => link.path === pathname)?.label || '';

    useEffect(() => {
        if (hideNavbar.includes(pathname)) return;
        async function fetchNotifications() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id);
            if (error) console.error('Error fetching notifications:', error);
            else setNotificationList(data ?? []);
        }
        fetchNotifications();
    }, [supabase, pathname]);

    const unreadCount = notificationList.filter((n) => n.unread).length;

    useEffect(() => {
        if (hideNavbar.includes(pathname)) return;
        async function fetchDisplayName() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', user.id)
                .single();
            if (error) console.error('Error fetching display name:', error);
            else setProfile(data ?? null);
        }
        fetchDisplayName();
    }, [supabase, pathname]);

    useEffect(() => {
        if (hideNavbar.includes(pathname)) return;
        const loadPet = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase.from('pets').select('level').eq('owner_id', user.id).maybeSingle();
            if (error) console.error('Error fetching pet level:', error);
            else setPet(data ?? null);
        };
        loadPet();
    }, [supabase, pathname]);

    if (hideNavbar.includes(pathname)) {
        // Prevent from rendering the navbar for the paths from above array
        return <>{children}</>;
    }

    return (
        <AppShell
            layout="alt"
            header={{ height: 60 }}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        >
            <AppShell.Header h={60} p="md" zIndex={200}>
                <Flex h="100%" align="center" justify="space-between" gap="sm">
                    <Group hiddenFrom="sm" gap="sm">
                        <Avatar variant='filled' color='#2F80ED' radius='md'>CG</Avatar>
                        <Text fw={700} size='xl'>CommonGrounds</Text>
                    </Group>
                    {/* <Text size='xl' fw={700}>{currentTitle}</Text> */} {/* Display the current page title */}
                    <Group visibleFrom="md" gap="sm" style={{ alignItems: 'center', justifyContent: 'flex-end' }} w='100%'>
                        <Badge
                            size='lg'
                            variant='light'
                            color='yellow'
                        >
                            <Flex direction='row' align='center' gap='sm'>
                                <Image src="assets/currency/student-coin.png" alt='' w='20px' h='20px' />
                                {coins}
                            </Flex>
                        </Badge>
                        <Badge
                            size='lg'
                            variant='light'
                            color='pink'
                            onClick={() => router.push('/notification')}
                            style={{ cursor: 'pointer' }}
                        >
                            <Flex direction='row' align='center' gap='sm'>
                                <Bell size={16} />
                                {unreadCount}
                            </Flex>
                        </Badge>
                        <Badge
                            size='lg'
                            variant='light'
                            color='blue'
                            onClick={() => router.push('/profile')}
                            style={{ cursor: 'pointer' }}
                        >
                            <Flex direction='row' align='center' gap='sm'>
                                {profile?.display_name || 'Profile'} • Lv {pet?.level ?? '—'}
                            </Flex>
                        </Badge>
                    </Group>
                    <Burger
                        opened={opened}
                        onClick={toggle}
                        hiddenFrom="sm"
                        size="sm"
                        lineSize={2}
                    />
                </Flex>
            </AppShell.Header>
            <AppShell.Navbar pr="md" pl="md" pb='md' pt={{ base: 70, sm: 'md' }}>
                <Group visibleFrom="sm" style={{ justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', gap: '10px', marginBottom: '20px' }}>
                    <Avatar variant='filled' color='#2F80ED' radius='md'>CG</Avatar>
                    <Text fw={700} size='xl'>CommonGrounds</Text>
                </Group>
                <Flex gap='5px' direction='column'>
                    {navlinks.map((link) => (
                        <FillCircle
                            key={link.label}
                            active={pathname === link.path}
                            label={link.label}
                            onClick={() => handleNavigation(link)}
                        />
                    ))}
                </Flex>
            </AppShell.Navbar>
            <AppShell.Main>
                {children}
            </AppShell.Main>
        </AppShell>
    );
}