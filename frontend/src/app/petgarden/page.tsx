import { getPetGrowth, getPetStatus, getXpProgress, xp_per_level } from "@/components/petgrowth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Box, Group, Image, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { Flower2, Sun } from "lucide-react";

export default async function PetGardenPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: pet } = await supabase.from("pets").select("species, name, level, xp, pet_energy").eq("owner_id", user.id).single();
    if (!pet) return null;
    const level = pet.level ?? 1;
    const xp = pet.xp ?? 0;
    const energy = pet.pet_energy ?? 100;
    const growth = getPetGrowth(level);
    const xpProgress = getXpProgress(xp);
    const petStatus = getPetStatus(energy);

    return (
        <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
            <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
                {/* Header */}
                <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
                    <Box>
                        <Title order={1} fw={800}>
                            Pet Garden
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Care for your companion — feed it, play with it, and watch it grow.
                        </Text>
                    </Box>
                    <Group gap={8}>
                        <Badge size="lg" radius="xl" variant="light" color="teal">
                            Level {pet.level} • {growth.stage}
                        </Badge>
                        <Badge
                            size="lg"
                            radius="xl"
                            variant="filled"
                            color={energy >= 60 ? "green" : energy >= 40 ? "yellow" : "red"}
                        >
                            {petStatus.status}
                        </Badge>
                    </Group>
                </Group>

                {/* garden */}
                <SimpleGrid cols={{ base: 1, lg: 3 }} spacing='md' mb={28}>
                    <Stack gap='md' style={{ gridColumn: 'span 2' }}>
                        <Paper radius="lg" shadow="sm" withBorder style={{ overflow: "hidden", position: "relative" }}>
                            <Box style={{ position: "relative", height: 440 }}>
                                <Image
                                    src={`/assets/garden-themes/default-garden.png`}
                                    alt={pet.name}
                                    fit='cover'
                                    w="100%"
                                    h="100%"
                                    style={{ position: 'absolute', inset: 0 }}
                                />
                                <Box
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: "linear-gradient(180deg, rgba(23,37,26,0.12) 0%, rgba(23,37,26,0) 40%, rgba(23,37,26,0.18) 100%)",
                                    }}
                                />
                                <Box style={{ position: "absolute", top: 16, left: 16 }}>
                                    <Tooltip label={`Status: ${petStatus.status}`} withArrow>
                                        <Box
                                            w={72}
                                            h={72}
                                            style={{
                                                borderRadius: 24,
                                                backgroundColor: "rgba(255,255,255,0.92)",
                                                display: "grid",
                                                placeItems: "center",
                                                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <Image src={petStatus.imageUrl} alt={petStatus.status} w={48} h={48} />
                                        </Box>
                                    </Tooltip>
                                </Box>

                                <Box
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "grid",
                                        placeItems: "center",
                                        paddingBottom: 48,
                                    }}
                                >
                                    <Image
                                        src={`/assets/starter-pets/${pet.species}.png`}
                                        alt={pet.name}
                                        w={300}
                                        h={300}
                                        fit="contain"
                                        style={{
                                            transform: `scale(${growth.scale})`,
                                            transition: "transform 0.5s ease",
                                            filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.25))",
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Paper>

                        {/* activity log */}
                        <Paper p="lg" radius="lg" shadow="sm" withBorder>
                            <Group gap={8} mb="md">
                                <ThemeIcon radius="lg" variant="light" color="green" size={32}>
                                    <Flower2 size={18} />
                                </ThemeIcon>
                                <Title order={3} fz="lg" fw={700}>
                                    Recent Activity
                                </Title>
                            </Group>
                            <Stack gap="sm">
                                <Group gap="sm" wrap="nowrap" align="flex-start">
                                </Group>
                            </Stack>
                        </Paper>
                    </Stack>

                    <Stack gap="md">
                        <Paper p="lg" radius="lg" shadow="sm" withBorder>
                            <Group justify="space-between" align="center" mb={6}>
                                <Box>
                                    <Text fz="xs" c="dimmed" tt="uppercase" fw={700} lts={1}>
                                        Companion
                                    </Text>
                                    <Title order={3} fz="xl" fw={800} mt={2}>
                                        {pet.name}
                                    </Title>
                                    <Text c="dimmed" size="sm">
                                        {pet.species === "bunny" ? "Bunny" : pet.species} • {growth.stage} stage
                                    </Text>
                                </Box>
                                <Box
                                    w={80}
                                    h={80}
                                    style={{
                                        borderRadius: 24,
                                        background: "linear-gradient(135deg, #D3F9D8, #EBFBEE)",
                                        display: "grid",
                                        placeItems: "center",
                                    }}
                                >
                                    <Image
                                        src={`/assets/starter-pets/${pet.species}.png`}
                                        alt={pet.name}
                                        w={64}
                                        h={64}
                                        fit="contain"
                                    />
                                </Box>
                            </Group>

                            <Group justify="space-between" mt={14} mb={6}>
                                <Text fz="sm" fw={600}>
                                    XP to next level
                                </Text>
                                <Text fz="sm" fw={700} c="green">
                                    {pet.xp}/{xp_per_level}
                                </Text>
                            </Group>
                            <Progress value={xpProgress} color="green" radius="xl" size="lg" />

                            <Group justify="space-between" mt={14} mb={6}>
                                <Text fz="sm" fw={600}>
                                    Energy
                                </Text>
                                <Text fz="sm" fw={700}>
                                    {energy}/100
                                </Text>
                            </Group>
                            <Progress value={energy} color={energy >= 60 ? "teal" : energy >= 40 ? "yellow" : "red"} radius="xl" size="lg" />
                        </Paper>

                        {/* care tips */}
                        <Paper p="lg" radius="lg" shadow="sm" withBorder>
                            <Group gap={8} mb="sm">
                                <ThemeIcon radius="lg" variant="light" color="yellow" size={32}>
                                    <Sun size={18} />
                                </ThemeIcon>
                                <Title order={3} fz="lg" fw={700}>
                                    Care Tips
                                </Title>
                            </Group>
                            <Stack gap="xs">
                                <Text size="sm" c="dimmed">
                                    • Study sessions restore energy.
                                </Text>
                                <Text size="sm" c="dimmed">
                                    • Sprout evolves to a new stage every 5 levels.
                                </Text>
                                <Text size="sm" c="dimmed">
                                    • To equip an accessory or outfit, go to the Reward Shop.
                                </Text>
                            </Stack>
                        </Paper>
                    </Stack>
                </SimpleGrid>
            </Box>
        </Box>
    );
}