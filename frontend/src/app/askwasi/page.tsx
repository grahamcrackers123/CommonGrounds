"use client";

import {
    ActionIcon,
    Badge,
    Card,
    Group,
    Paper,
    ScrollArea,
    Stack,
    Text,
    Textarea,
    Title,
} from "@mantine/core";
import {
    IconArrowUp,
    IconBook2,
    IconBrain,
    IconCalendar,
    IconFileText,
    IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
    role: "user" | "assistant";
    content: string;
};

const quickPrompts = [
    {
        label: "Explain a concept",
        icon: IconBook2,
        prompt:
            "Can you explain a concept from one of my subjects in a simple way?",
    },
    {
        label: "Quiz me",
        icon: IconBrain,
        prompt:
            "Quiz me on something I'm currently studying. Start with an easy question.",
    },
    {
        label: "Coursework",
        icon: IconFileText,
        prompt:
            "Can you help me understand or organize one of my current coursework tasks?",
    },
    {
        label: "Study plan",
        icon: IconCalendar,
        prompt:
            "Can you help me plan my study time based on my current coursework?",
    },
];

export default function AskWasiPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const sendMessage = async () => {
        const message = input.trim();

        if (!message || loading) {
            return;
        }

        setError("");
        setInput("");

        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                content: message,
            },
            {
                role: "assistant",
                content: "",
            },
        ]);

        setLoading(true);

        try {
            const response = await fetch("/api/askwasi", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);

                throw new Error(
                    data?.error || `Request failed (${response.status})`
                );
            }

            if (!response.body) {
                throw new Error("No response stream received.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, {
                    stream: true,
                });

                const events = buffer.split("\n\n");

                buffer = events.pop() ?? "";

                for (const event of events) {
                    if (!event.startsWith("data: ")) {
                        continue;
                    }

                    const json = event.slice(6);

                    let data: {
                        token?: string;
                        error?: string;
                        done?: boolean;
                    };

                    try {
                        data = JSON.parse(json);
                    } catch (parseError) {
                        console.error(
                            "Failed to parse SSE event:",
                            parseError
                        );
                        continue;
                    }

                    if (data.token) {
                        setMessages((prev) => {
                            const updated = [...prev];
                            const lastIndex = updated.length - 1;

                            if (
                                updated[lastIndex]?.role === "assistant"
                            ) {
                                updated[lastIndex] = {
                                    ...updated[lastIndex],
                                    content:
                                        updated[lastIndex].content +
                                        data.token,
                                };
                            }

                            return updated;
                        });
                    }

                    if (data.error) {
                        throw new Error(data.error);
                    }

                    if (data.done) {
                        console.log("Ask Wasi stream completed.");
                    }
                }
            }
        } catch (err) {
            console.error("Ask Wasi error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );

            setMessages((prev) => {
                const last = prev[prev.length - 1];

                if (
                    last?.role === "assistant" &&
                    last.content === ""
                ) {
                    return prev.slice(0, -1);
                }

                return prev;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        if (loading) {
            return;
        }

        setInput(prompt);
    };

    return (
        <Stack
            p={{ base: "md", sm: "xl" }}
            gap="md"
            maw={1050}
            mx="auto"
            style={{
                minHeight: "100%",
                background: "light-dark(#FFFFFF, #000000)",
                color: "light-dark(var(--mantine-color-text), #FFFFFF)",
            }}
        >
            {/* Chat Header */}
            <Card
                withBorder
                radius="lg"
                p="lg"
                style={{
                    borderColor: "light-dark(var(--mantine-color-blue-1), #292929)",
                    background: "light-dark(#FFFFFF, #000000)",
                    boxShadow:
                        "0 2px 12px rgba(0, 0, 0, 0.08)",
                }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <Paper
                            withBorder
                            radius="md"
                            p={8}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                    "light-dark(var(--mantine-color-blue-0), #151515)",
                                borderColor:
                                    "light-dark(var(--mantine-color-blue-1), #292929)",
                            }}
                        >
                            <IconSparkles
                                size={22}
                                stroke={1.8}
                            />
                        </Paper>

                        <div>
                            <Title order={2}>Ask Wasi</Title>

                            <Text size="sm" c="dimmed" mt={2}>
                                Your personalized learning
                                companion.
                            </Text>
                        </div>
                    </Group>

                    <Badge
                        variant="light"
                        radius="xl"
                        style={{
                            background: "light-dark(var(--mantine-color-blue-0), #151515)",
                            color: "light-dark(var(--mantine-color-blue-7), #FFFFFF)",
                            border: "1px solid light-dark(var(--mantine-color-blue-1), #292929)",
                        }}
                        leftSection={
                            <span
                                style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background:
                                        "var(--mantine-color-green-6)",
                                    display: "inline-block",
                                }}
                            />
                        }
                    >
                        Ready
                    </Badge>
                </Group>
            </Card>

            {/* Quick Prompts */}
            <Card
                withBorder
                radius="lg"
                p="md"
                style={{
                    background: "light-dark(var(--mantine-color-gray-0), #000000)",
                    borderColor: "light-dark(var(--mantine-color-gray-2), #292929)",
                }}
            >
                <Text
                    size="xs"
                    fw={700}
                    c="dimmed"
                    tt="uppercase"
                    mb="sm"
                >
                    Quick prompts
                </Text>

                <Group gap="sm">
                    {quickPrompts.map((item) => {
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() =>
                                    handleQuickPrompt(item.prompt)
                                }
                                disabled={loading}
                                style={{
                                    border:
                                        "1px solid light-dark(var(--mantine-color-blue-1), #292929)",
                                    background:
                                        "light-dark(var(--mantine-color-white), #151515)",
                                    color:
                                        "light-dark(var(--mantine-color-blue-7), #FFFFFF)",
                                    borderRadius: 999,
                                    padding: "8px 13px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 7,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: loading
                                        ? "not-allowed"
                                        : "pointer",
                                    boxShadow:
                                        "0 2px 0 rgba(0, 0, 0, 0.10)",
                                    transition:
                                        "all 120ms ease",
                                    opacity: loading ? 0.6 : 1,
                                }}
                                onMouseEnter={(event) => {
                                    if (loading) {
                                        return;
                                    }

                                    event.currentTarget.style.transform =
                                        "translateY(-1px)";

                                    event.currentTarget.style.boxShadow =
                                        "0 4px 10px rgba(0, 0, 0, 0.16)";

                                    event.currentTarget.style.background =
                                        "light-dark(var(--mantine-color-blue-0), #222222)";
                                }}
                                onMouseLeave={(event) => {
                                    event.currentTarget.style.transform =
                                        "translateY(0)";

                                    event.currentTarget.style.boxShadow =
                                        "0 2px 0 rgba(0, 0, 0, 0.10)";

                                    event.currentTarget.style.background =
                                        "light-dark(var(--mantine-color-white), #151515)";
                                }}
                            >
                                <Icon
                                    size={16}
                                    stroke={1.8}
                                />

                                {item.label}
                            </button>
                        );
                    })}
                </Group>
            </Card>

            {/* Conversation */}
            <Card
                withBorder
                radius="lg"
                p={0}
                style={{
                    flex: 1,
                    minHeight: 500,
                    overflow: "hidden",
                    borderColor:
                        "light-dark(var(--mantine-color-gray-2), #292929)",
                    background: "light-dark(#FFFFFF, #111111)",
                    boxShadow:
                        "0 4px 20px rgba(0, 0, 0, 0.25)",
                }}
            >
                <ScrollArea
                    h={520}
                    px={{ base: "md", sm: "xl" }}
                    py="xl"
                    scrollbarSize={6}
                >
                    {messages.length === 0 ? (
                        <Stack
                            align="center"
                            justify="center"
                            h={450}
                            gap="sm"
                        >
                            <Paper
                                radius="xl"
                                p="lg"
                                withBorder
                                style={{
                                    background:
                                        "light-dark(var(--mantine-color-blue-0), #151515)",
                                    borderColor:
                                        "light-dark(var(--mantine-color-blue-1), #292929)",
                                }}
                            >
                                <IconSparkles
                                    size={34}
                                    stroke={1.6}
                                />
                            </Paper>

                            <Title order={3} ta="center">
                                What are we learning today?
                            </Title>

                            <Text
                                c="dimmed"
                                ta="center"
                                maw={520}
                                size="sm"
                            >
                                Ask Wasi about your subjects,
                                coursework, difficult concepts,
                                or study planning. Choose a
                                quick prompt above or ask
                                anything below.
                            </Text>
                        </Stack>
                    ) : (
                        <Stack gap="lg">
                            {messages.map((message, index) => {
                                const isUser =
                                    message.role === "user";

                                const isStreaming =
                                    !isUser &&
                                    loading &&
                                    index === messages.length - 1;

                                return (
                                    <Group
                                        key={index}
                                        justify={
                                            isUser
                                                ? "flex-end"
                                                : "flex-start"
                                        }
                                        align="flex-start"
                                    >
                                        <Paper
                                            withBorder
                                            radius="lg"
                                            p="md"
                                            maw={{
                                                base: "92%",
                                                sm: "78%",
                                            }}
                                            style={{
                                                background: isUser
                                                    ? "light-dark(var(--mantine-color-blue-6), #1A1A1A)"
                                                    : "light-dark(var(--mantine-color-white), #151515)",
                                                color: isUser
                                                    ? "#FFFFFF"
                                                    : "light-dark(var(--mantine-color-text), #FFFFFF)",
                                                borderColor: isUser
                                                    ? "light-dark(var(--mantine-color-blue-6), #333333)"
                                                    : "light-dark(var(--mantine-color-blue-1), #292929)",
                                                boxShadow: isUser
                                                    ? "0 3px 10px rgba(0, 0, 0, 0.12)"
                                                    : "0 2px 8px rgba(0, 0, 0, 0.08)",
                                            }}
                                        >
                                            <Group
                                                gap={7}
                                                mb={5}
                                            >
                                                {!isUser && (
                                                    <IconSparkles
                                                        size={15}
                                                        stroke={1.8}
                                                    />
                                                )}

                                                <Text
                                                    size="xs"
                                                    fw={700}
                                                    style={{
                                                        color: isUser
                                                            ? "#FFFFFF"
                                                            : "light-dark(var(--mantine-color-blue-7), #FFFFFF)",
                                                    }}
                                                >
                                                    {isUser
                                                        ? "You"
                                                        : "Wasi"}
                                                </Text>
                                            </Group>

                                           {isUser ? (
    <Text
        size="sm"
        c="white"
        style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
        }}
    >
        {message.content}
    </Text>
) : message.content ? (
    <div
        style={{
            fontSize: 14,
            lineHeight: 1.6,
            overflowX: "auto",
        }}
    >
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                table: ({ children }) => (
                    <div
                        style={{
                            width: "100%",
                            overflowX: "auto",
                            margin: "12px 0",
                        }}
                    >
                        <table
                            style={{
                                width: "100%",
                                minWidth: 560,
                                borderCollapse: "collapse",
                                fontSize: 13,
                            }}
                        >
                            {children}
                        </table>
                    </div>
                ),

                th: ({ children }) => (
                    <th
                        style={{
                            border:
                                "1px solid light-dark(var(--mantine-color-gray-3), #333333)",
                            padding: "8px 10px",
                            textAlign: "left",
                            background:
                                "light-dark(var(--mantine-color-blue-0), #202020)",
                            fontWeight: 700,
                        }}
                    >
                        {children}
                    </th>
                ),

                td: ({ children }) => (
                    <td
                        style={{
                            border:
                                "1px solid light-dark(var(--mantine-color-gray-3), #333333)",
                            padding: "8px 10px",
                            verticalAlign: "top",
                        }}
                    >
                        {children}
                    </td>
                ),

                h1: ({ children }) => (
                    <Title order={2} mt="md" mb="sm">
                        {children}
                    </Title>
                ),

                h2: ({ children }) => (
                    <Title order={3} mt="md" mb="sm">
                        {children}
                    </Title>
                ),

                h3: ({ children }) => (
                    <Title order={4} mt="md" mb="sm">
                        {children}
                    </Title>
                ),

                p: ({ children }) => (
                    <p style={{ margin: "0 0 10px" }}>
                        {children}
                    </p>
                ),

                ul: ({ children }) => (
                    <ul
                        style={{
                            paddingLeft: 22,
                            marginTop: 6,
                            marginBottom: 10,
                        }}
                    >
                        {children}
                    </ul>
                ),

                ol: ({ children }) => (
                    <ol
                        style={{
                            paddingLeft: 22,
                            marginTop: 6,
                            marginBottom: 10,
                        }}
                    >
                        {children}
                    </ol>
                ),

                li: ({ children }) => (
                    <li style={{ marginBottom: 4 }}>
                        {children}
                    </li>
                ),

                code: ({ children }) => (
                    <code
                        style={{
                            background:
                                "light-dark(var(--mantine-color-gray-1), #222222)",
                            padding: "2px 5px",
                            borderRadius: 4,
                            fontSize: 13,
                        }}
                    >
                        {children}
                    </code>
                ),

                hr: () => (
                    <hr
                        style={{
                            border: 0,
                            borderTop:
                                "1px solid light-dark(var(--mantine-color-gray-2), #333333)",
                            margin: "16px 0",
                        }}
                    />
                ),
            }}
        >
            {message.content}
        </ReactMarkdown>
    </div>
) : (
    <Text size="sm" c="dimmed">
        {isStreaming ? "Wasi is thinking..." : ""}
    </Text>
)}
                                        </Paper>
                                    </Group>
                                );
                            })}
                        </Stack>
                    )}
                </ScrollArea>
            </Card>

            {/* Error */}
            {error && (
                <Paper
                    withBorder
                    radius="md"
                    p="sm"
                    style={{
                        borderColor:
                            "light-dark(var(--mantine-color-red-2), #3A2020)",
                        background:
                            "light-dark(var(--mantine-color-red-0), #140A0A)",
                    }}
                >
                    <Text
                        size="sm"
                        c="red"
                        ta="center"
                    >
                        {error}
                    </Text>
                </Paper>
            )}

            {/* Composer */}
            <Card
                withBorder
                radius="lg"
                p="sm"
                style={{
                    borderColor:
                        "light-dark(var(--mantine-color-blue-1), #292929)",
                    background: "light-dark(#FFFFFF, #0D0D0D)",
                    boxShadow:
                        "0 4px 16px rgba(0, 0, 0, 0.25)",
                }}
            >
                <Group align="flex-end" gap="sm"><Textarea
                        value={input}
                        onChange={(event) =>
                            setInput(
                                event.currentTarget.value
                            )
                        }
                        placeholder="Ask Wasi about your coursework..."
                        autosize
                        minRows={2}
                        maxRows={5}
                        variant="unstyled"
                        style={{
                            flex: 1,
                            color: "light-dark(var(--mantine-color-text), #FFFFFF)",
                            background: "light-dark(transparent, #151515)",
                            borderRadius: 8,
                            padding: "8px 10px",
                        }}
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter" &&
                                !event.shiftKey
                            ) {
                                event.preventDefault();
                                sendMessage();
                            }
                        }}
                    />

                    <ActionIcon
                        size={40}
                        radius="xl"
                        variant="filled"
                        onClick={sendMessage}
                        loading={loading}
                        disabled={!input.trim()}
                        aria-label="Send message"
                        style={{
                            background: "light-dark(var(--mantine-color-blue-6), #FFFFFF)",
                            color: "light-dark(#FFFFFF, #000000)",
                            border: "1px solid light-dark(var(--mantine-color-blue-6), #FFFFFF)",
                        }}
                    >
                        <IconArrowUp
                            size={19}
                            stroke={2}
                        />
                    </ActionIcon>
                </Group>
            </Card>

            <Text
                size="xs"
                c="dimmed"
                ta="center"
                style={{ color: "light-dark(var(--mantine-color-dimmed), #B3B3B3)" }}
            >
                Enter to send · Shift + Enter for a new line
            </Text>
        </Stack>
    );
}