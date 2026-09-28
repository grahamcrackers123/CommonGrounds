import CustomButton from "@/components/button";
import WelcomeRewardModal from "@/components/welcomerewardmodal";
import WorkloadStatusChip from "@/components/workload-status-chip";
import { createClient } from "@/lib/supabase/server";
import { Badge, Box, Flex, Group, Image, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { BookOpen, Clock, Coins, Flame, Target, TrendingUp, Zap } from "lucide-react";

const stats = [
    { label: "Study Time", icon: Clock, tint: "#E7F5FF", color: "#1C7ED6" },
    { label: "XP Earned", icon: Zap, tint: "#EBFBEE", color: "#2F9E44" },
    { label: "Coins", icon: Coins, tint: "#FFF4E6", color: "#E8590C" },
    { label: "Day Streak", icon: Flame, tint: "#FFF0F6", color: "#E64980" },
];

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("new_user_reward_claimed").eq("id", user.id).single();
    const { data: pet } = await supabase.from("pets").select("*").eq("owner_id", user.id).maybeSingle();
    const showReward = !profile?.new_user_reward_claimed;

    return (
        <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
            <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                {/* modal for welcome reward */}
                {showReward && <WelcomeRewardModal />}
                <WorkloadStatusChip />

                {/* Header */}
                <Group justify="space-between" align="flex-end" mb={28} wrap="wrap">
                    <Box>
                        <Text c='dimmed' fz='sm' tt='uppercase' fw={500} lts={1.2}>
                            {new Date().toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </Text>
                        {/* greeting here */}
                    </Box>
                    <Tooltip label="12-day streak">
                        <Badge
                            size="lg"
                            radius="xl"
                            variant="light"
                            color="pink"
                            leftSection={<Flame size={14} fill="currentColor" />}
                        >
                            0 day streak
                        </Badge>
                    </Tooltip>
                </Group>

                {/* stat cards */}
                <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md" mb={28}>
                    {stats.map((stat) => (
                        <Paper key={stat.label} p="lg" radius="lg" shadow="sm" withBorder>
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <Box>
                                    <Text c="dimmed" fz="sm" fw={600}>
                                        {stat.label}
                                    </Text>
                                    <Text fz={28} fw={800} mt={2}>
                                        {stat.label}
                                        {/* should show value */}
                                    </Text>
                                    <Text c="dimmed" fz="xs" mt={2}>
                                        {stat.label}
                                        {/* should show delta (e.g., +5% */}
                                    </Text>
                                </Box>
                                <ThemeIcon radius="xl" size={44} style={{ backgroundColor: stat.tint }} variant="light">
                                    <stat.icon size={22} style={{ color: stat.color }} />
                                </ThemeIcon>
                            </Group>
                        </Paper>
                    ))}
                </SimpleGrid>

                {/* Main Content */}
                <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb={28}>
                    <Stack gap='md' style={{ gridColumn: 'span 2' }}>
                        <Paper p='lg' radius='lg' shadow='sm' withBorder>
                            <Group justify='space-between' mb='md'>
                                <Group gap={8}>
                                    <ThemeIcon radius='lg' variant='light' color='green' size={32}>
                                        <Target size={18} />
                                    </ThemeIcon>
                                    <Title order={3} fz='lg' fw={700}>
                                        Today's Quests
                                    </Title>
                                </Group>
                                <Badge variant='light' color='green'>
                                    0/0 completed
                                    {/* still need to implement. for now hardcoded */}
                                </Badge>
                            </Group>

                            <Stack gap='xs' mb='md'>
                                {/* list of quests */}
                            </Stack>

                            <Group justify='space-between' align='center' mb={6}>
                                <Text fz='sm' fw={600}> Daily progress</Text>
                                <Text fz='sm' fw={700} c='green'>
                                    0%
                                    {/* still need to implement. for now hardcoded */}
                                </Text>
                            </Group>
                            <Progress value={0} size='lg' radius='xl' color='green' />
                        </Paper>

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
                                    0h total
                                    {/* still need to implement. for now hardcoded */}
                                </Text>
                            </Group>

                            <Flex align="flex-end" gap='xs' h={140}>
                                {/* weekly focus chart */}
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
                                        Level {pet?.level || 0} •
                                    </Badge>
                                </Box>
                                <Box
                                    w={100}
                                    h={100}
                                    style={{
                                        borderRadius: 24,
                                        background: "linear-gradient(135deg, #D3F9D8, #EBFBEE)",
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
                                    {pet?.pet_energy || 0}%
                                </Text>
                            </Group>
                            <Progress value={pet?.pet_energy || 0} size='lg' radius='xl' color='teal' mb='md' />
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
                            <Group justify='space-between' wrap='nowrap' mb='sm'>
                                <Box>
                                    {/* up next content */}
                                </Box>
                            </Group>
                        </Paper>
                    </Stack>
                </SimpleGrid>
            </Box>
        </Box >
    );
}