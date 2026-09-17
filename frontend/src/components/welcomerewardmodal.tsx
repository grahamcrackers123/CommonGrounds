"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, Flex, Group, Image, Modal, Paper, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PETS = [
    { id: "bunny", name: "Bunny", imageUrl: "/assets/starter-pets/bunny.png" },
    { id: "cat", name: "Cat", imageUrl: "/assets/starter-pets/cat.png" },
    { id: "dog", name: "Dog", imageUrl: "/assets/starter-pets/dog.png" }
]

export default function WelcomeRewardModal() {
    const [selectedPet, setSelectedPet] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [petName, setPetName] = useState("");
    const router = useRouter();

    const handleClaim = async () => {
        if (!selectedPet) return;
        setSubmitting(true);

        const supabase = createClient();
        const { data, error } = await supabase.rpc("claim_new_user_reward", {
            p_species: selectedPet,
            p_name: petName,
        });

        setSubmitting(false);

        if (error || !data) {
            notifications.show({ title: "Error", message: error?.message ?? "Reward was already claimed or could not be saved.", color: "red" });
            return;
        }

        notifications.show({ title: "Welcome!", message: "Your reward is here. Have fun with your new pet!", color: "green" });
        router.refresh();
    };

    return (
        <Modal
            opened
            onClose={() => { }}
            closeOnClickOutside={false}
            withCloseButton={false}
            centered
            size="lg"
        >
            <Stack align="center">
                <Text fw={700} size="xl">Welcome to Common Grounds!</Text>
                <Text ta='center'>For successfully finishing the onboarding process, you received a special reward:</Text>
                <Group gap="lg" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Flex direction="column" align="center">
                        <Image src="/assets/eggs/starter-egg.png" alt={"Starter Egg"} w={60} h={60} />
                        <Text size="sm" fw={500}>Starter Egg</Text>
                    </Flex>
                    <Flex direction="column" align="center">
                        <Image src="/assets/currency/student-coin.png" alt={"Student Coin"} w={60} h={60} />
                        <Text size="sm" fw={500}>100 Coins</Text>
                    </Flex>
                    <Flex direction="column" align="center">
                        <Image src="/assets/badge/new-user-badge.png" alt={"New User Badge"} w={60} h={60} />
                        <Text size="sm" fw={500}>New User Badge</Text>
                    </Flex>
                </Group>
                <Text ta='center'>Enjoy your journey and explore the features of our platform.</Text>

                <Text fw={600} mt="sm">Choose your starter pet to hatch your egg:</Text>
                <Group justify="center" gap="md">
                    {PETS.map((pet) => (
                        <Paper
                            key={pet.id}
                            withBorder
                            p="md"
                            radius="lg"
                            style={{
                                cursor: "pointer",
                                borderColor: selectedPet === pet.id ? "#2F80ED" : undefined,
                                borderWidth: selectedPet === pet.id ? 2 : 1,
                                backgroundColor: selectedPet === pet.id ? "#EAF3FF" : "white",
                            }}
                            onClick={(value) => {
                                if (pet.id !== selectedPet) setPetName('');
                                setSelectedPet(pet.id);
                            }}
                        >
                            <Flex direction="column" align="center" gap="xs">
                                <Image src={pet.imageUrl} alt={pet.name} w={80} h={80} />
                                <Text size="sm" fw={500}>{pet.name}</Text>
                            </Flex>
                        </Paper>
                    ))}
                </Group>

                {selectedPet && (
                    <TextInput
                        label={`Name your ${PETS.find(p => p.id === selectedPet)?.name}:`}
                        placeholder="Enter pet name"
                        value={petName}
                        onChange={(e) => setPetName(e.currentTarget.value)}
                        autoFocus
                        w="65%"
                        radius="lg"
                    />
                )}

                <Button
                    fullWidth
                    radius="lg"
                    disabled={!selectedPet || submitting}
                    loading={submitting}
                    onClick={handleClaim}
                    mt="md"
                >
                    Claim Reward
                </Button>
            </Stack>
        </Modal>
    );
}

