"use client";

import { ActionIcon, Button, Group, Modal, Stack, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_NAME_LENGTH = 24;

export default function PetNameEditor({ name }: { name: string }) {
    const router = useRouter();
    const [opened, setOpened] = useState(false);
    const [value, setValue] = useState(name);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const open = () => {
        setValue(name);
        setError(null);
        setOpened(true);
    };

    const save = async () => {
        const nextName = value.replace(/\s+/g, " ").trim();

        if (!nextName) {
            setError("Name cannot be empty");
            return;
        }
        if (nextName.length > MAX_NAME_LENGTH) {
            setError(`Name must be at most ${MAX_NAME_LENGTH} characters`);
            return;
        }

        setSaving(true);
        setError(null);

        const res = await fetch("/api/pets/name", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nextName }),
        });

        setSaving(false);

        if (!res.ok) {
            const data = await res.json().catch(() => null);
            setError(data?.error ?? "Could not update your pet's name.");
            return;
        }

        setOpened(false);
        notifications.show({ title: "Name updated", message: `Your companion is now called ${nextName}.`, color: "green" });
        router.refresh();
    };

    return (
        <>
            <Group gap={10}>
                <Title order={3} fz="xl" fw={800} mt={2}>
                    {name}
                </Title>
                <Tooltip label="Rename pet" withArrow>
                    <ActionIcon variant="subtle" color="gray" radius="xl" aria-label="Rename pet" onClick={open}>
                        <PenLine size={16} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            <Modal opened={opened} onClose={() => setOpened(false)} title="Rename your companion" centered radius="lg">
                <Stack gap="md">
                    <TextInput
                        label="Pet name"
                        value={value}
                        onChange={(event) => {
                            setValue(event.currentTarget.value);
                            setError(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !saving) void save();
                        }}
                        maxLength={MAX_NAME_LENGTH}
                        error={error}
                        autoFocus
                        radius="lg"
                    />
                    <Text fz="xs" c="dimmed">
                        {value.trim().length}/{MAX_NAME_LENGTH} characters
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" radius="lg" onClick={() => setOpened(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button radius="lg" loading={saving} onClick={() => void save()}>
                            Save
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
