import { Box, Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";

const CARD_SLOTS = [0, 1, 2, 3];

export default function DashboardLoading() {
    return (
        <Box style={{ backgroundColor: "light-dark(#F7F9FC, #000000)", minHeight: "100vh" }}>
            <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                <Group justify="space-between" align="flex-end" mb={28} wrap="wrap">
                    <Box>
                        <Skeleton height={14} width={180} mb={8} />
                        <Skeleton height={36} width={320} />
                    </Box>
                    <Skeleton height={36} width={120} radius="xl" />
                </Group>

                <Skeleton height={64} radius="md" mb={28} />

                <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md" mb={28}>
                    {CARD_SLOTS.map((slot) => (
                        <Paper key={slot} p="lg" radius="lg" shadow="sm" withBorder>
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <Box>
                                    <Skeleton height={12} width={80} mb={10} />
                                    <Skeleton height={28} width={100} mb={8} />
                                    <Skeleton height={10} width={120} />
                                </Box>
                                <Skeleton height={44} width={44} radius="xl" />
                            </Group>
                        </Paper>
                    ))}
                </SimpleGrid>

                <Skeleton height={220} radius="lg" mb={28} />

                <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                    <Stack gap="md" style={{ gridColumn: "span 2" }}>
                        <Skeleton height={220} radius="lg" />
                        <Skeleton height={220} radius="lg" />
                    </Stack>
                    <Stack gap="md">
                        <Skeleton height={260} radius="lg" />
                        <Skeleton height={150} radius="lg" />
                    </Stack>
                </SimpleGrid>
            </Box>
        </Box>
    );
}
