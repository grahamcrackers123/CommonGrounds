import { getPetGrowth, getPetStatus, getXpProgress, xp_per_level } from "@/components/petgrowth";
import { createClient } from "@/lib/supabase/server";
import { BackgroundImage, Box, Button, Center, Container, Flex, Group, Image, Progress, Text } from "@mantine/core";

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
        <Container mih="100vh" p={{ base: 20, md: 40 }} miw='100%' style={{ backgroundColor: "#F7F9FC" }}>
            <Flex direction='row' gap='md' w='100%' h='100%'>
                <BackgroundImage w='100%' mih={500} src='/assets/garden-themes/default-garden.png' style={{ padding: '20px', borderRadius: '10px' }}>
                    {pet?.species && (
                        <Center style={{ height: '100%' }}>
                            <Flex>
                                <Image
                                    src={`/assets/starter-pets/${pet.species}.png`}
                                    alt={pet.name}
                                    w={300}
                                    h={300}
                                    fit='contain'
                                    style={{ transform: `scale(${growth.scale})`, transition: 'transform 0.5s ease', alignItems: 'flex-end', alignSelf: 'flex-end' }}
                                />
                                <Image
                                    src={petStatus.imageUrl}
                                    alt={petStatus.status}
                                    w={150}
                                    h={150}
                                    fit='contain'
                                    style={{ alignItems: 'flex-start', alignSelf: 'flex-start' }}
                                />
                            </Flex>
                        </Center>
                    )}
                </BackgroundImage>

                <Box p='md' w='40%' h='50%' style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #ced4da', padding: '20px' }}>
                    <Flex direction='row' style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <Group style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0px' }}>
                            <Text fw={700} size="lg">
                                {pet?.name}
                            </Text>
                            <Text c='dimmed' size='sm'>Level: {level} • {growth.stage}</Text>
                        </Group>
                        <Button size='sm' radius='xl' variant='outline' color='blue' style={{ pointerEvents: 'none' }}>
                            {petStatus.status}
                        </Button>
                    </Flex>
                    <Group maw='100%' style={{ flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                        <Flex direction='column' gap='5px' w='100%'>
                            <Text size='sm' fw={500}>
                                {xp} / {xp_per_level} XP
                            </Text>
                            <Progress size='lg' value={xpProgress} />
                        </Flex>
                        <Flex direction='column' gap='5px' w='100%'>
                            <Text size='sm' fw={500}>
                                {energy} / 100
                            </Text>
                            <Progress size='lg' value={energy} />
                        </Flex>
                    </Group>
                    {/* <Progress size='lg' value={0} /> */}
                </Box>
            </Flex>
        </Container >
    );
}