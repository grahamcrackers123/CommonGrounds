"use client";

import { FaqSection } from "@/components/faq";
import { tutorialSteps, tutorialTabs, TutorialStepPanel, TutorialWelcome, type TutorialSection } from "@/components/tutorial";
import { createClient } from "@/lib/supabase/client";
import { Badge, Box, Divider, Flex, Group, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { CircleHelp, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

type HelpSection = TutorialSection | "faq";

export default function HelpPage() {
    return (
        <Suspense
            fallback={
                <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
                    <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                        <Text c="dimmed">Loading tutorials…</Text>
                    </Box>
                </Box>
            }
        >
            <HelpContent />
        </Suspense>
    );
}

function SidebarItem({
    active,
    label,
    icon: Icon,
    onClick,
}: {
    active: boolean;
    label: string;
    icon: typeof Sparkles;
    onClick: () => void;
}) {
    return (
        <UnstyledButton onClick={onClick} style={{ width: "100%" }}>
            <Group gap={10}
                p='sm'
                style={{
                    borderRadius: 10,
                    backgroundColor: active ? '#E7F5FF' : 'transparent',
                    border: `1px solid ${active ? "#74C0FC" : "transparent"}`,
                    transition: 'background-color 0.15s ease'
                }}
            >
                <Icon size={17} style={{ color: active ? '#1C7ED6' : '#868E96' }} />
                <Text fw={600} size='sm' c={active ? '#1C7ED6' : '#495057'}>
                    {label}
                </Text>
            </Group>
        </UnstyledButton>
    );
}

function HelpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isTour = searchParams.get("tour") === "1";
    const [activeTab, setActiveTab] = useState<HelpSection>(
        searchParams.get("tab") === "faq" ? "faq" : "welcome"
    );
    const supabase = useMemo(() => createClient(), []);

    const completeTutorial = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from("profiles")
                .update({ tutorial_completed: true })
                .eq("id", user.id);
            if (error) console.error("Error saving tutorial progress:", error);
        }
        router.push("/dashboard");
        router.refresh();
    };

    const activeIndex = tutorialTabs.findIndex((tab) => tab.key === activeTab);
    const currentStep = activeTab === "welcome" || activeTab === "faq" ? null : tutorialSteps[activeTab];
    const lastIndex = tutorialTabs.length - 1;
    const isFaq = activeTab === "faq";

    const goToStep = (index: number) => {
        const tab = tutorialTabs[index];
        if (tab) setActiveTab(tab.key);
    };

    return (
        <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
            <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
                    <Box>
                        <Title order={1} fw={800}>
                            Help & Tutorials
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            A quick tour of CommonGrounds. Replay any step whenever you like.
                        </Text>
                    </Box>
                    {activeTab !== "welcome" && !isFaq && (
                        <Badge color="blue" variant="light" size="lg" radius="xl">
                            Step {activeIndex} of {lastIndex}
                        </Badge>
                    )}
                </Group>

                <Flex gap='md' direction={{ base: 'column', md: 'row' }} align='flex-start'>
                    {/* sidebar */}
                    <Paper p='xs' radius='lg' shadow='sm' withBorder style={{ width: '100%', maxWidth: 260, flexShrink: 0 }}>
                        <Stack gap={4}>
                            {tutorialTabs.map((tab) => (
                                <SidebarItem
                                    key={tab.key}
                                    active={activeTab === tab.key}
                                    label={tab.label}
                                    icon={tab.icon}
                                    onClick={() => setActiveTab(tab.key)}
                                />
                            ))}

                            <Divider my={6} />

                            <Text fz='xs' tt='uppercase' fw={700} c='dimmed' lts={1} px='sm' mb={4}>
                                Reference
                            </Text>
                            <SidebarItem
                                active={isFaq}
                                label='FAQ'
                                icon={CircleHelp}
                                onClick={() => setActiveTab("faq")}
                            />
                        </Stack>
                    </Paper>

                    {/* content */}
                    <Paper p={{ base: 'lg', md: 'xl' }} radius='lg' shadow='sm' withBorder style={{ width: '100%', flex: 1 }}>
                        {isFaq ? (
                            <FaqSection />
                        ) : activeTab === "welcome" ? (
                            <TutorialWelcome
                                showActions={isTour}
                                onStart={() => goToStep(1)}
                                onSkip={() => void completeTutorial()}
                            />
                        ) : currentStep && (
                            <TutorialStepPanel
                                icon={tutorialTabs[activeIndex]?.icon ?? Sparkles}
                                {...currentStep}
                                isLast={activeIndex === lastIndex}
                                onOpen={() => router.push(currentStep.cta.path)}
                                onBack={() => goToStep(activeIndex - 1)}
                                onNext={() => {
                                    if (activeIndex !== lastIndex) {
                                        goToStep(activeIndex + 1);
                                    } else if (isTour) {
                                        void completeTutorial();
                                    } else {
                                        router.push("/dashboard");
                                    }
                                }}
                            />
                        )}
                    </Paper>
                </Flex>
            </Box>
        </Box>
    );
}
