"use client";

import {
    Button,
    Group,
    Modal,
    Progress,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    CalendarClock,
    Check,
    Coffee,
    Gift,
    Pause,
    Play,
    Sparkles,
    Timer,
    TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type PromptType =
    | "inactivity"
    | "restart_10min"
    | "schedule_extension"
    | "comeback_reward"
    | "progress_feedback";

type Prompt = {
    id: string;
    type: PromptType;
    quest_id: string | null;
    payload: Record<string, unknown> | null;
    status: string;
};

type RecoveryEvent = {
    id: string;
    prompt_id: string | null;
    quest_id: string | null;
    action_type: string;
};

type PetXp = {
    level: number;
    xp: number;
    leveledUp: boolean;
};

type Mode = "hidden" | "prompt" | "recovery" | "done";

const DEFAULT_RECOVERY_MINUTES = 10;
const COMPLETION_POLL_MS = 60 * 1000;

const PROMPT_META: Record<
    PromptType,
    {
        icon: typeof Timer;
        color: string;
        title: string;
        body: string;
        acceptLabel: string;
        acceptMessage: string;
    }
> = {
    inactivity: {
        icon: Coffee,
        color: "orange",
        title: "Ready to get back into it?",
        body: "No study activity was recorded in the last few days. Even a short session today counts.",
        acceptLabel: "I'm on it",
        acceptMessage: "Even a 10-minute session counts. Head to the focus room when you're ready.",
    },
    restart_10min: {
        icon: Timer,
        color: "blue",
        title: "Restart with 10 minutes",
        body: "You missed a few planned study sessions. A short restart session can get you back on track.",
        acceptLabel: "Start 10-minute session",
        acceptMessage: "",
    },
    schedule_extension: {
        icon: CalendarClock,
        color: "grape",
        title: "Let's clear the overdue pile",
        body: "Some deadlines have passed without completion. Consider rescheduling them so your plan stays realistic.",
        acceptLabel: "Sounds good",
        acceptMessage: "Open your quest calendar to reschedule the ones that slipped.",
    },
    comeback_reward: {
        icon: Gift,
        color: "teal",
        title: "Welcome back!",
        body: "You made it back. Pick up right where you left off.",
        acceptLabel: "Claim it",
        acceptMessage: "Welcome back. Your comeback reward is on its way.",
    },
    progress_feedback: {
        icon: TrendingUp,
        color: "green",
        title: "Nice progress!",
        body: "You're making steady progress. Keep the momentum going.",
        acceptLabel: "Thanks!",
        acceptMessage: "Keep it up!",
    },
};

const FALLBACK_META = {
    icon: Sparkles,
    color: "blue",
    title: "A quick check-in",
    body: "Just checking in on how things are going.",
    acceptLabel: "Sounds good",
    acceptMessage: "Got it.",
};

const formatClock = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const minutesFromPrompt = (prompt: Prompt) => {
    const value = prompt.payload?.duration_minutes;
    return typeof value === "number" && value > 0
        ? Math.round(value)
        : DEFAULT_RECOVERY_MINUTES;
};

export default function InterventionPrompt() {
    const [mode, setMode] = useState<Mode>("hidden");
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [recovery, setRecovery] = useState<RecoveryEvent | null>(null);
    const [totalSeconds, setTotalSeconds] = useState(DEFAULT_RECOVERY_MINUTES * 60);
    const [remaining, setRemaining] = useState(DEFAULT_RECOVERY_MINUTES * 60);
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [completionFailed, setCompletionFailed] = useState(false);
    const [petXp, setPetXp] = useState<PetXp | null>(null);

    const modeRef = useRef<Mode>("hidden");
    const finishingRef = useRef(false);
    const recoveryDismissedRef = useRef(false);
    const loadRef = useRef<() => Promise<void>>(async () => { });

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        // Look for an active prompt, then for a restart session that was
        // left unfinished. Never interrupts a modal that is already open.
        const load = async () => {
            if (modeRef.current !== "hidden") return;
            try {
                const res = await fetch("/api/interventions/prompt");
                if (!res.ok) return;
                const data = (await res.json()) as { prompt: Prompt | null };
                if (data.prompt?.id) {
                    setPrompt(data.prompt);
                    setMode("prompt");
                    return;
                }

                const recRes = await fetch("/api/interventions/recovery");
                if (!recRes.ok) return;
                const recData = (await recRes.json()) as {
                    recoveryEvent: RecoveryEvent | null;
                };
                if (recData.recoveryEvent?.id && !recoveryDismissedRef.current) {
                    setRecovery(recData.recoveryEvent);
                    setTotalSeconds(DEFAULT_RECOVERY_MINUTES * 60);
                    setRemaining(DEFAULT_RECOVERY_MINUTES * 60);
                    setCompletionFailed(false);
                    setRunning(false);
                    setMode("recovery");
                }
            } catch {
                return;
            }
        };

        loadRef.current = load;
        void load();
        const interval = setInterval(() => void load(), COMPLETION_POLL_MS);
        const onVisible = () => {
            if (document.visibilityState === "visible") void load();
        };
        // The dashboard status chip evaluates risk and can create a
        // prompt; check right away instead of waiting for the next poll.
        const onInterventionsUpdated = () => void load();
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("interventions:updated", onInterventionsUpdated);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("interventions:updated", onInterventionsUpdated);
        };
    }, []);

    // one tick per second while the recovery timer runs
    useEffect(() => {
        if (mode !== "recovery" || !running) return;
        const interval = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [mode, running]);

    const close = useCallback(() => {
        setMode("hidden");
        setPrompt(null);
        setRecovery(null);
        setRunning(false);
        setSubmitting(false);
        setCompletionFailed(false);
        setPetXp(null);
        setTimeout(() => void loadRef.current(), 500);
    }, []);

    // Stop the resume prompt from reappearing this session; the
    // recovery stays pending and is offered again on a fresh visit.
    const finishLater = () => {
        recoveryDismissedRef.current = true;
        close();
    };

    const completeRecovery = useCallback(async () => {
        if (!recovery || finishingRef.current) return;
        finishingRef.current = true;
        setSubmitting(true);
        try {
            const res = await fetch(
                `/api/interventions/recovery/${encodeURIComponent(recovery.id)}/complete`,
                { method: "POST" }
            );
            const data = (await res.json().catch(() => ({}))) as {
                petXp?: PetXp | null;
                error?: string;
            };
            if (!res.ok) {
                throw new Error(data.error ?? "Could not save the session");
            }
            setPetXp(data.petXp ?? null);
            setRunning(false);
            setMode("done");
            notifications.show({
                title: "Recovery complete",
                message: "Nice work getting back on track.",
                color: "green",
            });
        } catch (error) {
            setCompletionFailed(true);
            notifications.show({
                title: "Could not save the session",
                message:
                    error instanceof Error
                        ? error.message
                        : "You appear to be offline.",
                color: "red",
            });
        } finally {
            setSubmitting(false);
            finishingRef.current = false;
        }
    }, [recovery]);

    // when the countdown reaches zero, complete the recovery session
    useEffect(() => {
        if (
            mode === "recovery" &&
            !running &&
            remaining === 0 &&
            !completionFailed &&
            recovery
        ) {
            const t = setTimeout(() => void completeRecovery(), 0);
            return () => clearTimeout(t);
        }
    }, [mode, running, remaining, completionFailed, recovery, completeRecovery]);

    const meta = prompt ? PROMPT_META[prompt.type] ?? FALLBACK_META : FALLBACK_META;
    const message =
        typeof prompt?.payload?.message === "string" && prompt.payload.message
            ? prompt.payload.message
            : meta.body;
    const progress =
        totalSeconds > 0
            ? Math.round(((totalSeconds - remaining) / totalSeconds) * 100)
            : 0;

    const respond = async (action: "accept" | "postpone" | "dismiss") => {
        if (!prompt || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(
                `/api/interventions/prompt/${encodeURIComponent(prompt.id)}/respond`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action }),
                }
            );
            const data = (await res.json().catch(() => ({}))) as {
                recoveryEvent?: RecoveryEvent | null;
                error?: string;
            };
            if (!res.ok) {
                throw new Error(data.error ?? "Could not save your response");
            }

            if (action === "postpone") {
                notifications.show({
                    title: "Snoozed",
                    message: "We'll check back in about an hour.",
                    color: "blue",
                });
                close();
                return;
            }

            if (action === "dismiss") {
                close();
                return;
            }

            if (data.recoveryEvent?.id) {
                const minutes = minutesFromPrompt(prompt);
                recoveryDismissedRef.current = false;
                setRecovery(data.recoveryEvent);
                setTotalSeconds(minutes * 60);
                setRemaining(minutes * 60);
                setRunning(true);
                setCompletionFailed(false);
                setMode("recovery");
                return;
            }

            notifications.show({
                title: "Got it",
                message: meta.acceptMessage,
                color: "green",
            });
            close();
        } catch (error) {
            notifications.show({
                title: "Something went wrong",
                message:
                    error instanceof Error
                        ? error.message
                        : "You appear to be offline.",
                color: "red",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const Icon = mode === "recovery" ? Timer : meta.icon;

    return (
        <Modal
            opened={mode !== "hidden"}
            onClose={() => {
                if (mode === "done") close();
            }}
            centered
            radius="lg"
            size="md"
            withCloseButton={false}
            closeOnClickOutside={false}
            closeOnEscape={false}
        >
            {mode === "prompt" && prompt && (
                <Stack align="center" gap="sm">
                    <ThemeIcon size={54} radius="xl" variant="light" color={meta.color}>
                        <Icon size={26} />
                    </ThemeIcon>
                    <Title order={3} ta="center">
                        {meta.title}
                    </Title>
                    <Text c="dimmed" size="sm" ta="center">
                        {message}
                    </Text>
                    <Stack gap={8} w="100%" mt="sm">
                        <Button
                            fullWidth
                            radius="lg"
                            color="green"
                            loading={submitting}
                            onClick={() => void respond("accept")}
                        >
                            {meta.acceptLabel}
                        </Button>
                        <Button
                            fullWidth
                            radius="lg"
                            variant="default"
                            disabled={submitting}
                            onClick={() => void respond("postpone")}
                        >
                            Remind me in 1 hour
                        </Button>
                        <Button
                            fullWidth
                            radius="lg"
                            variant="subtle"
                            color="gray"
                            disabled={submitting}
                            onClick={() => void respond("dismiss")}
                        >
                            Dismiss
                        </Button>
                    </Stack>
                </Stack>
            )}

            {mode === "recovery" && (
                <Stack align="center" gap="sm">
                    <ThemeIcon size={54} radius="xl" variant="light" color="blue">
                        <Icon size={26} />
                    </ThemeIcon>
                    <Title order={3} ta="center">
                        {Math.round(totalSeconds / 60)}-minute restart
                    </Title>
                    <Text c="dimmed" size="sm" ta="center">
                        Small steps count. Start the timer and give your next task{" "}
                        {Math.round(totalSeconds / 60)} focused minutes.
                    </Text>
                    <Text
                        fz={44}
                        fw={800}
                        lh={1}
                        mt="xs"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {formatClock(remaining)}
                    </Text>
                    <Progress
                        value={progress}
                        w="100%"
                        size="lg"
                        radius="xl"
                        color="blue"
                    />
                    <Group w="100%" mt="sm">
                        <Button
                            fullWidth
                            radius="lg"
                            color={running ? "yellow" : "blue"}
                            leftSection={running ? <Pause size={16} /> : <Play size={16} />}
                            disabled={remaining === 0 || submitting}
                            onClick={() => setRunning((prev) => !prev)}
                        >
                            {running
                                ? "Pause"
                                : remaining === totalSeconds
                                    ? "Start"
                                    : "Resume"}
                        </Button>
                    </Group>
                    {completionFailed && (
                        <Button
                            fullWidth
                            radius="lg"
                            color="green"
                            leftSection={<Check size={16} />}
                            loading={submitting}
                            onClick={() => void completeRecovery()}
                        >
                            Try saving again
                        </Button>
                    )}
                    <Button
                        fullWidth
                        radius="lg"
                        variant="subtle"
                        color="gray"
                        disabled={submitting}
                        onClick={finishLater}
                    >
                        Finish later
                    </Button>
                </Stack>
            )}

            {mode === "done" && (
                <Stack align="center" gap="sm">
                    <ThemeIcon size={54} radius="xl" variant="light" color="green">
                        <Check size={26} />
                    </ThemeIcon>
                    <Title order={3} ta="center">
                        Recovery complete!
                    </Title>
                    <Text c="dimmed" size="sm" ta="center">
                        {petXp
                            ? petXp.leveledUp
                                ? `Nice work getting back on track. Your pet leveled up to level ${petXp.level}!`
                                : `Nice work getting back on track. Your pet is now level ${petXp.level}.`
                            : "Nice work getting back on track."}
                    </Text>
                    <Button fullWidth radius="lg" color="green" mt="sm" onClick={close}>
                        Done
                    </Button>
                </Stack>
            )}
        </Modal>
    );
}
