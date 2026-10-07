"use client";

import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Paper,
    ScrollArea,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core";
import {
    IconArrowUp,
    IconBook2,
    IconBrain,
    IconCalendar,
    IconFileText,
    IconPlus,
    IconSearch,
    IconSparkles,
    IconFolder,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Upload } from "lucide-react";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type Conversation = {
    id: string;
    title: string;
    messages: Message[];
};

type Material = {
    id: string;
    filename: string;
    storage_path: string;
    subject: string | null;
    quest_id: string | null;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
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
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searchChat, setSearchChat] = useState("");
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadingMaterial, setUploadingMaterial] = useState(false);

   const handleNewChat = () => { if (loading) { return; } 
   const newConversationId = crypto.randomUUID(); setActiveConversationId(newConversationId); setMessages([]); setInput(""); setError(""); }; useEffect(() => {
   const loadConversations = async () => { try { 
   const response = await fetch("/api/askwasi"); if (!response.ok) { throw new Error("Could not load chat history."); } 
   const data = await response.json(); setConversations(data.conversations ?? []); } catch (err) { console.error("Failed to load conversations:", err); } }; loadConversations(); }, []); 
   const handleOpenConversation = (conversation: Conversation) => { if (loading) { return; } setActiveConversationId(conversation.id); setMessages(conversation.messages); setInput(""); setError(""); };
   const sendMessage = async () => {
    const message = input.trim();

    if (!message || loading) {
        return;
    }

    const conversationId =
        activeConversationId ?? crypto.randomUUID();

    if (!activeConversationId) {
        setActiveConversationId(conversationId);
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
                conversationId,
            }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => null);

            throw new Error(
                data?.error || `Request failed (${response.status})`
            );
        }

        const contentType =
            response.headers.get("content-type") ?? "";

        /*
         * No relevant material:
         * the backend returns a normal JSON response.
         */
        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (!data?.message) {
                throw new Error(
                    "Wasi returned an empty response."
                );
            }

            setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;

                if (
                    updated[lastIndex]?.role === "assistant"
                ) {
                    updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: data.message,
                    };
                }

                return updated;
            });

            return;
        }

        /*
         * Relevant material:
         * the backend returns an SSE stream.
         */
        if (!response.body) {
            throw new Error(
                "No response stream received."
            );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
            const { value, done } =
                await reader.read();

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
                        const lastIndex =
                            updated.length - 1;

                        if (
                            updated[lastIndex]?.role ===
                            "assistant"
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
                    console.log(
                        "Ask Wasi stream completed."
                    );
                }
            }
        }
    } catch (err) {
        console.error(
            "Ask Wasi error:",
            err
        );

        setError(
            err instanceof Error
                ? err.message
                : "Something went wrong."
        );

        setMessages((prev) => {
            const last =
                prev[prev.length - 1];

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

        try {
            const response =
                await fetch("/api/askwasi");

            if (response.ok) {
                const data =
                    await response.json();

                setConversations(
                    data.conversations ?? []
                );
            }
        } catch (err) {
            console.error(
                "Failed to refresh conversations:",
                err
            );
        }
    }
};

useEffect(() => {
    const loadMaterials = async () => {
        try {
            setLoadingMaterials(true);

            const response = await fetch("/api/materials", {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Could not load materials.");
            }

            const data = await response.json();

            setMaterials(data.materials ?? []);
        } catch (err) {
            console.error("Failed to load materials:", err);
            setMaterials([]);
        } finally {
            setLoadingMaterials(false);
        }
    };

    loadMaterials();
}, []);

const handleUploadMaterial = () => {
    fileInputRef.current?.click();
};

const handleMaterialSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) {
        return;
    }

    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
    ];

    const allowedExtensions = [
        ".pdf",
        ".docx",
        ".txt",
        ".md",
    ];

    const lowerName = file.name.toLowerCase();

    const validType = allowedTypes.includes(file.type);

    const validExtension = allowedExtensions.some(
        (extension) => lowerName.endsWith(extension)
    );

    if (!validType && !validExtension) {
        alert(
            "Please select a PDF, DOCX, TXT, or MD file."
        );
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert(
            "The maximum file size is 10 MB."
        );
        return;
    }

    try {
        setUploadingMaterial(true);

        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch("/api/materials", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to upload material."
            );
        }

        if (data.material) {
            setMaterials((current) => [
                data.material,
                ...current,
            ]);
        }

        alert("Material uploaded successfully.");
    } catch (error) {
        console.error("Upload material error:", error);

        alert(
            error instanceof Error
                ? error.message
                : "Failed to upload material."
        );
    } finally {
        setUploadingMaterial(false);
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
        maw={1250}
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

{/* Main Ask Wasi Workspace */}
<Group
    align="stretch"
    gap="md"
    wrap="nowrap"
    style={{
        flex: 1,
        minHeight: 600,
    }}
>
    {/* Ask Wasi Sidebar */}
    <Card
        withBorder
        radius="lg"
        p="md"
        w={{ base: 230, sm: 260 }}
        style={{
            flexShrink: 0,
            borderColor:
                "light-dark(var(--mantine-color-gray-2), #292929)",
            background:
                "light-dark(#FFFFFF, #111111)",
        }}
    >
        <Stack gap="sm">

            {/* New Chat */}
            <button
                type="button"
                onClick={handleNewChat}
                disabled={loading}
                style={{
                    width: "100%",
                    border: "1px solid light-dark(var(--mantine-color-gray-2), #333333)",
                    background: "light-dark(#FFFFFF, #151515)",
                    color: "light-dark(var(--mantine-color-text), #FFFFFF)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                }}
            >
                <IconPlus size={17} />
                New chat
            </button>

            {/* Search Chat */}
            <TextInput
                value={searchChat}
                onChange={(event) =>
                    setSearchChat(event.currentTarget.value)
                }
                placeholder="Search chat"
                leftSection={<IconSearch size={16} />}
                size="sm"
            />

           {/* Materials */}

<div
    style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    }}
>
    <div
        style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
        }}
    >
        <IconFileText size={17} />

        <Text size="sm" fw={600}>
            Materials
        </Text>

        {materials.length > 0 && (
            <Badge size="xs" variant="light">
                {materials.length}
            </Badge>
        )}
    </div>

    <Button
        size="xs"
        leftSection={<Upload size={14} />}
        loading={uploadingMaterial}
        onClick={handleUploadMaterial}
    >
        Upload
    </Button>
</div>

<input
    ref={fileInputRef}
    type="file"
    accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
    onChange={handleMaterialSelected}
    style={{ display: "none" }}
/>

{loadingMaterials ? (
    <Text size="xs" c="dimmed" pl={10}>
        Loading materials...
    </Text>
) : materials.length > 0 ? (
    <Stack gap={4} pl={10} mt={4}>
        {materials.map((material) => (
            <Text
                key={material.id}
                size="xs"
                c="dimmed"
                lineClamp={1}
                title={material.filename}
            >
                {material.filename}
            </Text>
        ))}
    </Stack>
) : (
    <Text size="xs" c="dimmed" pl={10} mt={4}>
        No materials uploaded yet.
    </Text>
)}

            {/* Projects */}
            <button
                type="button"
                style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "light-dark(var(--mantine-color-text), #FFFFFF)",
                    borderRadius: 8,
                    padding: "9px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                    cursor: "pointer",
                }}
            >
                <IconFolder size={17} />
                Projects
            </button>

            {/* Recent Chats */}
            <Stack gap={6} mt="sm">
                <Text
                    size="xs"
                    fw={700}
                    c="dimmed"
                    tt="uppercase"
                >
                    Recent Chats
                </Text>

                {conversations.filter((conversation) =>
    conversation.title
        .toLowerCase()
        .includes(searchChat.toLowerCase())
).length > 0 ? (
    conversations
        .filter((conversation) =>
            conversation.title
                .toLowerCase()
                .includes(searchChat.toLowerCase())
        )
        .map((conversation) => (
            <Paper
                key={conversation.id}
                withBorder
                radius="md"
                p="xs"
                onClick={() =>
                    handleOpenConversation(conversation)
                }
                style={{
                    cursor: loading
                        ? "not-allowed"
                        : "pointer",
                    background:
                        conversation.id ===
                        activeConversationId
                            ? "light-dark(var(--mantine-color-blue-0), #151515)"
                            : undefined,
                }}
            >
                <Text size="sm" lineClamp={2}>
                    {conversation.title}
                </Text>
            </Paper>
        ))
) : (
    <Text size="sm" c="dimmed">
        No recent chats
    </Text>
)}
            </Stack>
        </Stack>
    </Card>

    {/* Conversation Area */}
    <Stack
        gap="md"
        style={{
            flex: 1,
            minWidth: 0,
        }}
    >
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
    </Group>
</Stack>
    );
}