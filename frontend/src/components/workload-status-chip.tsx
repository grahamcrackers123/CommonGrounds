"use client";

import { useEffect, useState } from "react";
import { Badge, Paper, Text } from "@mantine/core";

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

    useEffect(() => {
        const loadStatus = async () => {
            try {
                const response = await fetch(
                    "/api/interventions/status"
                );

                if (!response.ok) {
                    return;
                }

                const data =
                    (await response.json()) as InterventionStatus;

                setStatus(data);
            } catch (error) {
                console.error(
                    "Could not load workload status:",
                    error
                );
            }
        };

        void loadStatus();
    }, []);

    if (!status) {
        return null;
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
        </Paper>
    );
}