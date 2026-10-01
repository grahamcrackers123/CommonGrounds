"use client";

import { Button } from "@mantine/core";
import { useRouter } from "next/navigation";

export default function CustomButton({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    return (
        <Button
            onClick={() => router.push('/petgarden')}
            variant="outline"
            radius="lg"
            fullWidth
        >
            {children}
        </Button>
    );
}