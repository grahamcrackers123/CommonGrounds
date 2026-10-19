"use client";

import { useEffect, useState } from "react";
import { Badge, Group, List, Loader, Paper, Text } from "@mantine/core";

type RiskFlag = {
    type: string;
    message: string;
};

type InterventionStatus = {
    flags: RiskFlag[];
    summary: string;
};

export default function WorkloadStatusChip() {
    const [status, setStatus] =
        useState<InterventionStatus | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const loadStatus = async () => {
            try {
                const response = await fetch(
                    "/api/interventions/status"
                );

                if (!response.ok) {
                    setFailed(true);
                    return;
                }

                const data =
                    (await response.json()) as InterventionStatus;

                setStatus(data);
                window.dispatchEvent(new Event("interventions:updated"));
            } catch (error) {
                console.error(
                    "Could not load workload status:",
                    error
                );
                setFailed(true);
            }
        };

        void loadStatus();
    }, []);

    if (failed) {
        return null;
    }

    if (!status) {
        return (
            <Paper
                p="md"
                withBorder
                radius="md"
            >
                <Group gap="xs">
                    <Loader size="xs" />

                    <Text
                        size="sm"
                        c="dimmed"
                    >
                        Checking workload...
                    </Text>
                </Group>
            </Paper>
        );
    }

    const hasRisk = status.flags.length > 0;

    return (
        <Paper
            p="md"
            withBorder
            radius="md"
        >
            <Badge
                color={hasRisk ? "yellow" : "green"}
                variant="light"
            >
                {hasRisk
                    ? "Workload needs attention"
                    : "Workload looks balanced"}
            </Badge>

            <Text
                size="sm"
                mt="xs"
            >
                {status.summary}
            </Text>

            {hasRisk && (
                <List
                    size="xs"
                    mt="xs"
                    spacing={2}
                    c="dimmed"
                >
                    {status.flags.map((flag) => (
                        <List.Item key={flag.type}>
                            {flag.message}
                        </List.Item>
                    ))}
                </List>
            )}
        </Paper>
    );
}
