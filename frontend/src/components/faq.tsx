"use client";

import { Accordion, Box, Button, Group, Paper, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { Bot, Cat, Coins, Search, Target, Timer, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FaqItem = {
    question: string;
    answer: string;
    action?: { label: string; path: string };
};

type FaqGroup = {
    category: string;
    icon: typeof Search;
    items: FaqItem[];
};

// check this again before user testing
const faqGroups: FaqGroup[] = [
    {
        category: "Account & setup",
        icon: UserRound,
        items: [
            {
                question: "Do I have to finish the setup?",
                answer:
                    "Yes. Until setup is complete, CommonGrounds keeps sending you back to it. Your answers build your schedule, subjects, and preferences.",
            },
            {
                question: "Can I change my setup answers later?",
                answer:
                    "Yes. Everything from setup can be edited in Settings; your academic profile, study schedule, subjects, and notification preferences.",
                action: { label: "Open Settings", path: "/settings" },
            },
            {
                question: "Can I change my email or password?",
                answer:
                    "Not yet. Email and password changes aren't available in the app at the moment.",
            },
            {
                question: "How do I log out or delete my account?",
                answer:
                    "Go to Settings, then Account. Logout is in the danger zone, and deleting your account permanently removes your profile, pet, quests, rewards, badges, and notifications.",
                action: { label: "Open Settings", path: "/settings" },
            },
        ],
    },
    {
        category: "Quests",
        icon: Target,
        items: [
            {
                question: "What is a quest?",
                answer:
                    "A quest is a coursework task with a subject, deadline, priority, and estimated time. Completing one earns you coins and pet XP.",
                action: { label: "Open Quest Calendar", path: "/questcalendar" },
            },
            {
                question: "Where do the priority rules come from?",
                answer:
                    "You set them during setup for each coursework type (High, Medium, Low). They're applied when you create quests and can be changed in Settings.",
                action: { label: "Open Settings", path: "/settings" },
            },
            {
                question: "How do deadlines affect my dashboard?",
                answer:
                    "Your next pending deadline appears on the dashboard so you always know what's coming up.",
            },
        ],
    },
    {
        category: "Focus Room",
        icon: Timer,
        items: [
            {
                question: "Can I study alone?",
                answer: "Yes. Create a room and run a focus session on your own.",
                action: { label: "Open Focus Room", path: "/focusroom" },
            },
            {
                question: "How do I study with friends?",
                answer:
                    "Add friends and invite them from the Focus Room. A room holds up to 4 people.",
                action: { label: "Open Focus Room", path: "/focusroom" },
            },
            {
                question: "What are the ambient sounds?",
                answer: "Silence, Rain, Cafe, and Forest. Pick whichever helps you concentrate.",
            },
            {
                question: "What happens if I leave a session early?",
                answer:
                    "Rewards scale with the time you complete, so finishing the full duration earns the most coins, pet energy, and streak XP.",
            },
        ],
    },
    {
        category: "Pet & progress",
        icon: Cat,
        items: [
            {
                question: "How does my pet level up?",
                answer:
                    "Your pet earns XP from quests and focus sessions, and evolves every 5 levels, from Baby all the way to Mature.",
                action: { label: "Open Pet Garden", path: "/petgarden" },
            },
            {
                question: "What is energy and how do I restore it?",
                answer:
                    "Energy decays while you're away. Focus sessions and completed quests restore it, and low energy changes your pet's status in the Pet Garden.",
                action: { label: "Open Pet Garden", path: "/petgarden" },
            },
            {
                question: "How do I style my pet?",
                answer:
                    "Buy accessories and outfits in the Reward Shop, then equip them there. Select an equipped item again to remove it.",
                action: { label: "Open Reward Shop", path: "/rewardshop" },
            },
            {
                question: "How is my streak counted?",
                answer:
                    "You gain a streak day every day you show up. It's recorded when you open your dashboard. Consecutive days increase your streak, and missing a day resets it to 1. Dates follow Manila time.",
                action: { label: "Open Progress Map", path: "/progressmap" },
            },
            {
                question: "Where can I see my overall progress?",
                answer:
                    "The Progress Map breaks down your study time and XP by subject, tracks your streak, and shows your pet's growth.",
                action: { label: "Open Progress Map", path: "/progressmap" },
            },
        ],
    },
    {
        category: "Coins & rewards",
        icon: Coins,
        items: [
            {
                question: "How do I earn coins?",
                answer:
                    "Completing quests, finishing focus sessions, daily rewards, and streaks all earn you student coins.",
            },
            {
                question: "What can I buy in the Reward Shop?",
                answer:
                    "Three aisles: Eggs, Pet Style (accessories and outfits), and Garden Decor (garden themes).",
                action: { label: "Open Reward Shop", path: "/rewardshop" },
            },
        ],
    },
    {
        category: "Ask Wasi & privacy",
        icon: Bot,
        items: [
            {
                question: "What can Ask Wasi do?",
                answer:
                    "Wasi can explain concepts, quiz you, help organize coursework, and build study plans. You can also upload learning materials and ask questions about them.",
                action: { label: "Open Ask Wasi", path: "/askwasi" },
            },
            {
                question: "How do I delete my data?",
                answer:
                    "Use Settings, then Privacy & Data. Deleting your account removes your profile, pet, quests, rewards, badges, and notifications permanently.",
                action: { label: "Open Settings", path: "/settings" },
            },
        ],
    },
];

export function FaqSection() {
    const router = useRouter();
    const [query, setQuery] = useState("");

    const groups = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return faqGroups;
        return faqGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    `${item.question} ${item.answer}`.toLowerCase().includes(term)
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [query]);

    return (
        <Stack gap='lg'>
            <Box>
                <Title order={3} fz='xl' fw={700}>
                    Frequently asked questions
                </Title>
                <Text c='dimmed' size='sm' mt={4}>
                    Quick answers about setup, quests, focus sessions, coins, and your pet.
                </Text>
            </Box>

            <TextInput
                placeholder='Search questions…'
                leftSection={<Search size={16} />}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                radius='lg'
                size='md'
            />

            {groups.length === 0 ? (
                <Paper radius='lg' p='lg' withBorder>
                    <Text c='dimmed' size='sm'>
                        No results for &quot;{query.trim()}&quot;. Try another word.
                    </Text>
                </Paper>
            ) : (
                groups.map((group) => (
                    <Box key={group.category}>
                        <Group gap={8} mb='sm'>
                            <ThemeIcon radius='lg' variant='light' color='blue' size={30}>
                                <group.icon size={16} />
                            </ThemeIcon>
                            <Title order={4} fz='md' fw={700}>
                                {group.category}
                            </Title>
                        </Group>
                        <Accordion variant='separated' radius='lg'>
                            {group.items.map(({ question, answer, action }) => (
                                <Accordion.Item key={question} value={question}>
                                    <Accordion.Control>
                                        <Text fw={600} size='sm'>
                                            {question}
                                        </Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Text size='sm'>{answer}</Text>
                                        {action && (
                                            <Button
                                                variant='light'
                                                radius='lg'
                                                size='xs'
                                                mt='sm'
                                                onClick={() => router.push(action.path)}
                                            >
                                                {action.label}
                                            </Button>
                                        )}
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </Box>
                ))
            )}
        </Stack>
    );
}
