import CopyUserCode from "@/components/copyusercode";
import { getPetGrowth, xp_per_level } from "@/components/petgrowth";
import { applyEnergyDecay } from "@/lib/pet-energy";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, Box, Flex, Group, Image, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { BookOpen, CalendarClock, Clock3, GraduationCap, Medal, School, Sparkles, Timer, UserRound } from "lucide-react";

function to12Hour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default async function ProfilePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: pet } = await supabase.from("pets").select("species, name, level, xp, pet_energy").eq("owner_id", user.id).single();
    if (!pet) return null;
    await applyEnergyDecay(supabase, pet);
    const growth = getPetGrowth(pet.level);

    const { data: profile } = await supabase.from("profiles").select("display_name, school, program, user_code, level, enrollment_status, weekly_availability, focus_length, study_time, created_at").eq("id", user.id).single();
    if (!profile) return null;
    type UserBadge = { badges: { id: string; name: string; description: string; image_url: string } };

    const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badges(id, name, description, image_url)")
        .eq("user_id", user.id) as { data: UserBadge[] | null };
    if (!userBadges) return null;

    return (
        <Box style={{ backgroundColor: '#F7F9FC', minHeight: '100vh' }}>
            <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                <Paper p={{ base: 'lg', md: 'xl' }} shadow="sm" radius="lg" withBorder mb={24}>
                    <Group justify='space-between' align='flex-start' wrap='wrap'>
                        <Group gap='lg' wrap='nowrap' align='center'>
                            <Avatar size={110} radius={110} color='green' style={{ border: '3px solid #D3F9D8' }}>
                                <Text fw={800} fz={32}>
                                    NA
                                </Text>
                            </Avatar>
                            <Box>
                                <Group gap={10}>
                                    <Title order={2} fw={800}>
                                        {profile.display_name}
                                    </Title>
                                    <CopyUserCode userCode={profile.user_code} />
                                </Group>
                                <Group gap={6} mt={6}>
                                    <School size={15} color="#868E96" />
                                    <Text c='dimmed' size='sm' fw={500}>
                                        {profile.school}
                                    </Text>
                                </Group>
                                <Group gap={6} mt={2}>
                                    <GraduationCap size={15} color="#868E96" />
                                    <Text c='dimmed' size='sm' fw={500}>
                                        {profile.program}
                                    </Text>
                                </Group>
                            </Box>
                        </Group>
                        <Box ta={{ base: 'left', md: 'right' }}>
                            <Text c="dimmed" fz="xs">
                                Joined {new Date(profile.created_at).toLocaleDateString()}
                            </Text>
                        </Box>
                    </Group>
                </Paper>

                {/* stats */}
                {/* <SimpleGrid cols={{ base: 2, lg: 4 }} spacing='md' mb={24}>
                </SimpleGrid> */}

                {/* study profile & companion */}
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing='md' mb={24}>
                    <Paper p='lg' radius='lg' shadow='sm' withBorder>
                        <Group gap={8} mb='lg'>
                            <ThemeIcon radius='lg' variant='light' color='blue' size={32}>
                                <BookOpen size={18} />
                            </ThemeIcon>
                            <Title order={3} fz='lg' fw={700}>
                                Study Profile
                            </Title>
                        </Group>
                        <Stack gap='sm'>
                            <InfoRow icon={UserRound} tint="#DFF8EA" label="Enrollment" value={profile.enrollment_status} />
                            <InfoRow icon={CalendarClock} tint='#E7F5FF' label='Availability' value={profile?.weekly_availability.map((slot) => `${slot.day} ${to12Hour(slot.start)}–${to12Hour(slot.end)}`).join(" • ")} />
                            <InfoRow icon={Clock3} tint='#DFF8EA' label='Preferred Study Period' value={profile.study_time} />
                            <InfoRow icon={Timer} tint='#E7F5FF' label='Focus Length' value={`${profile.focus_length} minutes per session`} />
                        </Stack>
                    </Paper>

                    <Paper p='lg' radius='lg' shadow='sm' withBorder>
                        <Group gap={8} mb='lg'>
                            <ThemeIcon radius='lg' variant='light' color='blue' size={32}>
                                <Sparkles size={18} />
                            </ThemeIcon>
                            <Title order={3} fz='lg' fw={700}>
                                Companion
                            </Title>
                        </Group>
                        <Flex direction='column' align='center' w='100%'>
                            <Box
                                w={150}
                                h={150}
                                style={{
                                    borderRadius: 40,
                                    background: "linear-gradient(135deg, #D3F9D8, #EBFBEE)",
                                    display: 'grid',
                                    placeItems: 'center',
                                }}
                            >
                                <Image src={`/assets/starter-pets/${pet.species}.png`} alt={pet.name} width={120} height={120} fit='contain' />
                            </Box>
                            <Text fw={700} fz='lg' mt={4}>
                                {pet.name}
                            </Text>
                            <Badge variant='light' color='teal'>
                                Level {pet.level} • {growth.stage}
                            </Badge>
                            <Box w='100%' mt={8}>
                                <Group justify='space-between' mb={4}>
                                    <Text fz='xs' c='dimmed' fw={600}>
                                        XP to next level
                                    </Text>
                                    <Text fz='xs' c='green' fw={700}>
                                        {pet.xp} / {xp_per_level}
                                    </Text>
                                </Group>
                                <Progress value={pet.xp} color='teal' radius='xl' size='md' />
                            </Box>
                        </Flex>
                    </Paper>
                </SimpleGrid>

                {/* badges */}
                <Paper p='lg' radius='lg' shadow='sm' withBorder>
                    <Group justify='space-between' mb='lg'>
                        <Group gap={8}>
                            <ThemeIcon radius='lg' variant='light' color='blue' size={32}>
                                <Medal size={18} />
                            </ThemeIcon>
                            <Title order={3} fz='lg' fw={700}>
                                Achievements & Badges
                            </Title>
                        </Group>
                        <Text c='dimmed' fz='sm' fw={600}>
                            {/* total of badges */}
                            {userBadges.length} Badge(s)
                        </Text>
                    </Group>
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing='md'>
                        {userBadges.map((userBadge) => (
                            <Tooltip key={userBadge.badges.id} label={userBadge.badges.description} withArrow>
                                <Stack align='center' gap={6}>
                                    <Box
                                        w={84}
                                        h={84}
                                        style={{
                                            borderRadius: 28,
                                            display: 'grid',
                                            placeItems: 'center',
                                            backgroundColor: '#EBFBEE'
                                        }}
                                    >
                                        {/* badge owned */}
                                        <Image src={userBadge.badges.image_url} alt={userBadge.badges.name} w={56} h={56} fit='contain' />
                                    </Box>
                                    <Text fz='sm' fw={600} ta='center' lh={1.2}>
                                        {userBadge.badges.name}
                                    </Text>
                                </Stack>
                            </Tooltip>
                        ))}
                    </SimpleGrid>
                </Paper>
            </Box>
        </Box>
    );
}

function InfoRow({
    icon: Icon,
    tint,
    label,
    value,
}: {
    icon: typeof UserRound;
    tint: string;
    label: string;
    value: string;
}) {
    return (
        <Group gap='sm' wrap='nowrap' align='center'>
            <ThemeIcon radius='xl' variant='light' color='blue' size={33} style={{ backgroundColor: tint }}>
                <Icon size={16} style={{ color: '#495057' }} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
                <Text fz='xs' c='dimmed' fw={600} tt='uppercase' lts={0.8}>
                    {label}
                </Text>
                <Text size='sm' fw={600} mt={1}>
                    {value}
                </Text>
            </Box>
        </Group>
    );
}