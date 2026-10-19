"use client";

import { Button, Group, SegmentedControl, TextInput } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
    range: string;
    from: string;
    to: string;
};

export default function ProgressRangeControl({ range, from, to }: Props) {
    const router = useRouter();
    const [fromValue, setFromValue] = useState(from);
    const [toValue, setToValue] = useState(to);

    const apply = (nextRange: string, nextFrom = fromValue, nextTo = toValue) => {
        const params = new URLSearchParams();
        params.set("range", nextRange);

        if (nextRange === "custom") {
            if (nextFrom) params.set("from", nextFrom);
            if (nextTo) params.set("to", nextTo);
        }

        // Next.js scrolls to the top on navigation by default; keep
        // the user's scroll position when only the range changes.
        router.push(`/progressmap?${params.toString()}`, { scroll: false });
    };

    return (
        <Group gap="xs" wrap="wrap" align="center">
            <SegmentedControl
                size="sm"
                radius="xl"
                value={range}
                color="blue"
                bg="light-dark(blue.1)"
                onChange={(value) => apply(value)}
                data={[
                    { value: "week", label: "Week" },
                    { value: "month", label: "Month" },
                    { value: "custom", label: "Custom" },
                ]}
            />

            {range === "custom" && (
                <Group gap="xs" align="center">
                    <TextInput
                        type="date"
                        size="xs"
                        radius="xl"
                        w={150}
                        aria-label="From date"
                        value={fromValue}
                        onChange={(event) => setFromValue(event.currentTarget.value)}
                    />

                    <TextInput
                        type="date"
                        size="xs"
                        radius="xl"
                        w={150}
                        aria-label="To date"
                        value={toValue}
                        onChange={(event) => setToValue(event.currentTarget.value)}
                    />

                    <Button
                        size="compact-xs"
                        radius="xl"
                        variant="light"
                        onClick={() => apply("custom")}
                    >
                        Apply
                    </Button>
                </Group>
            )}
        </Group>
    );
}
