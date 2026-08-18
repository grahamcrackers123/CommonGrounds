"use client";

import { AppShell, Group, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

export default function Navbar() {
    const [active, setActive] = useState('Dashboard');
    const [opened, { toggle }] = useDisclosure(false);
    const router = useRouter();

    const handleNavigation = (label: string) => {
        setActive(label);

        const path = label.toLowerCase().replace(/\s+/g, '-');

        router.push(path);
    };

    return (
        <AppShell
            layout="alt"
            header={{ height: 60 }}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        >
            <AppShell.Header h={60} p="md">
            </AppShell.Header>
            <AppShell.Navbar p="md">
                <FillCircle active={active === "Dashboard"} label="Dashboard" onClick={() => handleNavigation("Dashboard")} />
                <FillCircle active={active === "Ask Wasi"} label="Ask Wasi" onClick={() => handleNavigation("Ask Wasi")} />
                <FillCircle active={active === "Quest Calendar"} label="Quest Calendar" onClick={() => handleNavigation("Quest Calendar")} />
                <FillCircle active={active === "Focus Room"} label="Focus Room" onClick={() => handleNavigation("Focus Room")} />
                <FillCircle active={active === "Pet Garden"} label="Pet Garden" onClick={() => handleNavigation("Pet Garden")} />
                <FillCircle active={active === "Reward Shop"} label="Reward Shop" onClick={() => handleNavigation("Reward Shop")} />
                <FillCircle active={active === "Progress Map"} label="Progress Map" onClick={() => handleNavigation("Progress Map")} />
                <FillCircle active={active === "Settings"} label="Settings" onClick={() => handleNavigation("Settings")} />
            </AppShell.Navbar>
            <AppShell.Main p="md">
                {/* Main content goes here */}
            </AppShell.Main>
        </AppShell>
    );
}