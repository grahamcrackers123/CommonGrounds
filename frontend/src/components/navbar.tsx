"use client";

import { AppShell, Avatar, Burger, Button, Flex, Group, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Circle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

export default function Navbar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [opened, { toggle }] = useDisclosure(false);
    const router = useRouter();
    const supabase = createClient();

    const navlinks = [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Ask Wasi", path: "/askwasi" },
        { label: "Quest Calendar", path: "/questcalendar" },
        { label: "Focus Room", path: "/focusroom" },
        { label: "Pet Garden", path: "/petgarden" },
        { label: "Reward Shop", path: "/rewardshop" },
        { label: "Progress Map", path: "/progressmap" },
        { label: "Settings", path: "/settings" }
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/access');
        router.refresh();
    };

    const handleNavigation = (link: { label: string; path: string }) => {
        router.push(link.path);
    };

    const hideNavbar = ['/access', '/forgot-password', '/setup'];

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
                {/*Temporary Placeholder for the Logout Button. This would be moved to a different page; Settings or Profile*/}
                <Flex align='end' justify='end' mt='auto'>
                    <Button variant='outline' fullWidth onClick={handleLogout}>
                        Log Out
                    </Button>
                </Flex>
            </AppShell.Navbar>
            <AppShell.Main>
                {children}
            </AppShell.Main>
        </AppShell>
    );
}