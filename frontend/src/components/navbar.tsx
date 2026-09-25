"use client";

import {
    ActionIcon,
    AppShell,
    Avatar,
    Burger,
    Button,
    Flex,
    Group,
    Text,
    UnstyledButton,
    useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Circle, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function FillCircle({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <UnstyledButton
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                width: "100%",
            }}
        >
            <Group
                gap="md"
                w="100%"
                style={{
                    backgroundColor: active
                        ? "light-dark(var(--mantine-color-blue-light), #1A1A1A)"
                        : "transparent",
                    padding: "8px 16px",
                    borderRadius: "16px",
                }}
            >
                <Circle
                    size={16}
                    fill={
                        active
                            ? "light-dark(var(--mantine-color-blue-6), #FFFFFF)"
                            : "none"
                    }
                    stroke={
                        active
                            ? "light-dark(var(--mantine-color-blue-6), #FFFFFF)"
                            : "light-dark(var(--mantine-color-dimmed), #B3B3B3)"
                    }
                />

                <Text
                    c={
                        active
                            ? "light-dark(var(--mantine-color-blue-6), #FFFFFF)"
                            : "light-dark(var(--mantine-color-text), #FFFFFF)"
                    }
                    fw={active ? 700 : 400}
                >
                    {label}
                </Text>
            </Group>
        </UnstyledButton>
    );
}

export default function Navbar({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [opened, { toggle }] = useDisclosure(false);
    const router = useRouter();
    const supabase = createClient();

    const { colorScheme, setColorScheme } =
        useMantineColorScheme();

    const navlinks = [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Ask Wasi", path: "/askwasi" },
        { label: "Quest Calendar", path: "/questcalendar" },
        { label: "Focus Room", path: "/focusroom" },
        { label: "Pet Garden", path: "/petgarden" },
        { label: "Reward Shop", path: "/rewardshop" },
        { label: "Progress Map", path: "/progressmap" },
        { label: "Settings", path: "/settings" },
    ];

    const handleThemeToggle = async () => {
        const nextTheme =
            colorScheme === "dark" ? "light" : "dark";

        // Change the UI immediately
        setColorScheme(nextTheme);

        // Save the user's preference to their profile
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update({
                theme_preference: nextTheme,
            })
            .eq("id", user.id);

        if (error) {
            console.error(
                "Could not save theme preference:",
                error
            );
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/access");
        router.refresh();
    };

    const handleNavigation = (link: {
        label: string;
        path: string;
    }) => {
        router.push(link.path);
    };

    const hideNavbar = [
        "/access",
        "/forgot-password",
        "/setup",
    ];

    if (hideNavbar.includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <AppShell
            layout="alt"
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: "sm",
                collapsed: {
                    mobile: !opened,
                },
            }}
        >
            <AppShell.Header
                h={60}
                p="md"
                zIndex={200}
                style={{
                    backgroundColor: "light-dark(#FFFFFF, #000000)",
                    borderColor:
                        "light-dark(var(--mantine-color-gray-2), #292929)",
                }}
            >
                <Flex
                    h="100%"
                    align="center"
                    justify="space-between"
                    gap="sm"
                >
                    <Group hiddenFrom="sm" gap="sm">
                        <Avatar
                            variant="filled"
                            color="blue"
                            radius="md"
                        >
                            CG
                        </Avatar>

                        <Text fw={700} size="xl">
                            CommonGrounds
                        </Text>
                    </Group>

                    <Group gap="sm">
                        <ActionIcon
                            variant="default"
                            size="lg"
                            radius="md"
                            onClick={handleThemeToggle}
                            aria-label="Toggle color scheme"
                        >
                            {colorScheme === "dark" ? (
                                <Sun size={18} />
                            ) : (
                                <Moon size={18} />
                            )}
                        </ActionIcon>

                        <Burger
                            opened={opened}
                            onClick={toggle}
                            hiddenFrom="sm"
                            size="sm"
                            lineSize={2}
                        />
                    </Group>
                </Flex>
            </AppShell.Header>

            <AppShell.Navbar
                pr="md"
                pl="md"
                pb="md"
                pt={{
                    base: 70,
                    sm: "md",
                }}
                style={{
                    backgroundColor: "light-dark(#FFFFFF, #000000)",
                    borderColor:
                        "light-dark(var(--mantine-color-gray-2), #292929)",
                }}
            >
                <Group
                    visibleFrom="sm"
                    style={{
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        width: "100%",
                        gap: "10px",
                        marginBottom: "20px",
                    }}
                >
                    <Avatar
                        variant="filled"
                        color="blue"
                        radius="md"
                    >
                        CG
                    </Avatar>

                    <Text fw={700} size="xl">
                        CommonGrounds
                    </Text>
                </Group>

                <Flex
                    gap="5px"
                    direction="column"
                >
                    {navlinks.map((link) => (
                        <FillCircle
                            key={link.label}
                            active={pathname === link.path}
                            label={link.label}
                            onClick={() =>
                                handleNavigation(link)
                            }
                        />
                    ))}
                </Flex>

                <Flex
                    align="end"
                    justify="end"
                    mt="auto"
                >
                    <Button
                        variant="outline"
                        fullWidth
                        onClick={handleLogout}
                    >
                        Log Out
                    </Button>
                </Flex>
            </AppShell.Navbar>

            <AppShell.Main
                style={{
                    backgroundColor:
                        "light-dark(#F8F9FA, #000000)",
                }}
            >
                {children}
            </AppShell.Main>
        </AppShell>
    );
}