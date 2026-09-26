"use client";

import { createClient } from "@/lib/supabase/client";

import {
    Anchor,
    Box,
    Button,
    Checkbox,
    Divider,
    Flex,
    Group,
    MantineProvider,
    PasswordInput,
    Popover,
    Progress,
    SegmentedControl,
    Text,
    TextInput,
    Title,
} from "@mantine/core";

import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";

import {
    Check,
    Lock,
    Mail,
    User,
    X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* ----------------------------- */
/* Password requirement component */
/* ----------------------------- */

function PasswordRequirement({
    meets,
    label,
}: {
    meets: boolean;
    label: string;
}) {
    return (
        <Text
            c={meets ? "teal" : "red"}
            style={{
                display: "flex",
                alignItems: "center",
            }}
            mt={7}
            size="sm"
        >
            {meets ? <Check size={14} /> : <X size={14} />}
            <Box ml={10}>{label}</Box>
        </Text>
    );
}

/* ----------------------------- */
/* Password requirements */
/* ----------------------------- */

const requirements: { re: RegExp; label: string }[] = [
    {
        re: /[0-9]/,
        label: "Includes number",
    },
    {
        re: /[a-z]/,
        label: "Includes lowercase letter",
    },
    {
        re: /[A-Z]/,
        label: "Includes uppercase letter",
    },
    {
        re: /[$&+,:;=?@#|'<>.^*()%!-]/,
        label: "Includes special symbol",
    },
];

/* ----------------------------- */
/* Password strength */
/* ----------------------------- */

function getStrength(password: string) {
    let multiplier = password.length > 5 ? 0 : 1;

    requirements.forEach((requirement) => {
        if (!requirement.re.test(password)) {
            multiplier += 1;
        }
    });

    return Math.max(
        100 -
            (100 / (requirements.length + 1)) *
                multiplier,
        10
    );
}

/* ----------------------------- */
/* User code generator */
/* ----------------------------- */

function generateUserCode() {
    return (
        "U" +
        Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()
    );
}

/* ----------------------------- */
/* Access page */
/* ----------------------------- */

export default function AccessPage() {
    const isMobile = useMediaQuery(
        "(max-width: 768px)"
    );

    const router = useRouter();
    const supabase = createClient();

    const [value, setValue] = useState("signin");

    const [popoverOpened, setPopoverOpened] =
        useState(false);

    const [signupPassword, setSignupPassword] =
        useState("");

    const [signinLoading, setSigninLoading] =
        useState(false);

    const [signinError, setSigninError] =
        useState<string | null>(null);

    const [signupLoading, setSignupLoading] =
        useState(false);

    const [signupError, setSignupError] =
        useState<string | null>(null);

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const strength = getStrength(signupPassword);

    const color =
        strength === 100
            ? "teal"
            : strength > 50
              ? "yellow"
              : "red";

    /* ----------------------------- */
    /* Sign-in form */
    /* ----------------------------- */

    const signinForm = useForm({
        mode: "uncontrolled",

        initialValues: {
            email: "",
            password: "",
            rememberMe: false,
        },

        validate: {
            email: (value) =>
                emailRegex.test(value)
                    ? null
                    : "Invalid email",

            password: (value) =>
                value.length >= 6
                    ? null
                    : "Password must be at least 6 characters",
        },
    });

    /* ----------------------------- */
    /* Sign-up form */
    /* ----------------------------- */

    const signupForm = useForm({
        mode: "uncontrolled",

        initialValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },

        validate: {
            firstName: (value) =>
                value.length < 2
                    ? "First name must be at least 2 letters"
                    : null,

            lastName: (value) =>
                value.length < 2
                    ? "Last name must be at least 2 letters"
                    : null,

            email: (value) =>
                emailRegex.test(value)
                    ? null
                    : "Invalid email",

            password: (value) =>
                value.length >= 6
                    ? null
                    : "Password must be at least 6 characters",

            confirmPassword: (
                value,
                values
            ) =>
                value !== values.password
                    ? "Passwords do not match"
                    : null,
        },
    });

    /* ----------------------------- */
    /* Forgot password */
    /* ----------------------------- */

    const handleForgotPassword = () => {
        router.push("/forgot-password");
    };

    /* ----------------------------- */
    /* Sign in */
    /* ----------------------------- */

    const handleSignIn = async (
        values: typeof signinForm.values
    ) => {
        setSigninError(null);
        setSigninLoading(true);

        const { error } =
            await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });

        console.log(
            "LOGIN SIGN-IN DEBUG:",
            {
                success: !error,
                error: error?.message,
            }
        );

        if (error) {
            setSigninLoading(false);

            const message =
                error.message.toLowerCase();

            if (
                message.includes(
                    "invalid login credentials"
                )
            ) {
                setSigninError(
                    "Incorrect email or password."
                );
            } else {
                setSigninError(error.message);
            }

            return;
        }

        /* Check that Supabase actually created a session */

        const {
            data: { session },
            error: sessionError,
        } =
            await supabase.auth.getSession();

        console.log(
            "LOGIN SESSION DEBUG:",
            {
                hasSession: !!session,
                userId: session?.user?.id,
                sessionError:
                    sessionError?.message,
            }
        );

        if (!session) {
            setSigninLoading(false);

            setSigninError(
                sessionError?.message ||
                    "Login succeeded, but the session could not be created."
            );

            return;
        }

        /*
         * Use Next.js client-side navigation.
         *
         * The previous implementation used:
         *
         * window.location.href = "/dashboard";
         *
         * This triggered the React/Next.js ESLint
         * immutability and no-location-assign rules.
         */

        router.push("/dashboard");
    };

    /* ----------------------------- */
    /* Sign up */
    /* ----------------------------- */

    const handleSignUp = async (
        values: typeof signupForm.values
    ) => {
        setSignupError(null);
        setSignupLoading(true);

        const displayName =
            values.firstName +
            " " +
            values.lastName;

        const {
            data: { user },
            error,
        } =
            await supabase.auth.signUp({
                email: values.email,
                password: values.password,

                options: {
                    data: {
                        display_name:
                            displayName,
                    },

                    emailRedirectTo:
                        window.location.origin +
                        "/callback",
                },
            });

        setSignupLoading(false);

        if (error) {
            const message =
                error.message.toLowerCase();

            if (
                message.includes(
                    "already registered"
                )
            ) {
                signupForm.setFieldError(
                    "email",
                    "An account with this email already exists."
                );
            } else if (
                message.includes("password")
            ) {
                signupForm.setFieldError(
                    "password",
                    error.message
                );
            } else {
                setSignupError(
                    error.message
                );
            }

            return;
        }

        /*
         * Keep the existing profile insert
         * behavior from the original page.
         */

        if (user) {
            const { error: insertError } =
                await supabase
                    .from("profiles")
                    .insert({
                        id: user.id,
                        user_code:
                            generateUserCode(),
                        display_name:
                            displayName,
                    });

            if (insertError) {
                console.error(
                    "profile insert error:",
                    insertError
                );
            }
        }

        setSignupError(
            "We will send an automated confirmation email if an account does not already exist with this email."
        );
    };

    /* ----------------------------- */
    /* Google authentication */
    /* ----------------------------- */

    const handleGoogleAuth = async (
        access: "signin" | "signup"
    ) => {
        const { error } =
            await supabase.auth.signInWithOAuth({
                provider: "google",

                options: {
                    redirectTo:
                        window.location.origin +
                        "/callback",
                },
            });

        if (error) {
            if (access === "signin") {
                setSigninError(
                    error.message
                );
            } else {
                setSignupError(
                    error.message
                );
            }
        }
    };

    /* ----------------------------- */
    /* UI */
    /* ----------------------------- */

    return (
        <MantineProvider forceColorScheme="light">
            <Flex
                direction="row"
                mih="100vh"
                w="100%"
            >
                {/* Left side */}

                <Flex
                    direction="column"
                    gap="md"
                    mih="100vh"
                    w="50%"
                    p="md"
                />

                {/* Right side */}

                <Flex
                    direction="column"
                    gap="md"
                    mih="100vh"
                    w="50%"
                    p="md"
                    justify="center"
                    bg="white"
                >
                    {/* Logo / title */}

                    <Flex
                        justify="center"
                        mb="xl"
                    >
                        <Title
                            order={1}
                            fz={{
                                base: "xl",
                                md: "2xl",
                            }}
                            fw={700}
                        >
                            CommonGrounds
                        </Title>
                    </Flex>

                    {/* Welcome message */}

                    <Group
                        justify="center"
                        align="center"
                        gap="md"
                    >
                        {value === "signin" ? (
                            <Flex
                                direction="column"
                                align="center"
                            >
                                <Text
                                    fw="bold"
                                    fz={{
                                        base: "md",
                                        md: "xl",
                                    }}
                                >
                                    Welcome back!
                                </Text>

                                <Text
                                    c="dimmed"
                                    fz={{
                                        base: "md",
                                        md: "xl",
                                    }}
                                    ta="center"
                                >
                                    Please enter your
                                    details.
                                </Text>
                            </Flex>
                        ) : (
                            <Flex
                                direction="column"
                                align="center"
                            >
                                <Text
                                    fw="bold"
                                    fz={{
                                        base: "md",
                                        md: "xl",
                                    }}
                                >
                                    Welcome!
                                </Text>

                                <Text
                                    c="dimmed"
                                    fz={{
                                        base: "md",
                                        md: "xl",
                                    }}
                                    ta="center"
                                >
                                    Create an account
                                    to get started!
                                </Text>
                            </Flex>
                        )}

                        {/* Sign-in / Sign-up switch */}

                        <SegmentedControl
                            color="blue"
                            bg="white"
                            radius="lg"
                            autoContrast
                            data={[
                                {
                                    label: "Sign In",
                                    value: "signin",
                                },
                                {
                                    label: "Sign Up",
                                    value: "signup",
                                },
                            ]}
                            value={value}
                            onChange={setValue}
                            w="100%"
                        />
                    </Group>

                    {/* ========================= */}
                    {/* SIGN IN */}
                    {/* ========================= */}

                    {value === "signin" && (
                        <form
                            onSubmit={signinForm.onSubmit(
                                handleSignIn
                            )}
                        >
                            <TextInput
                                label="Email"
                                placeholder="Enter your email"
                                leftSection={
                                    <Mail size={18} />
                                }
                                radius="lg"
                                key={signinForm.key(
                                    "email"
                                )}
                                {...signinForm.getInputProps(
                                    "email"
                                )}
                                mb="md"
                                size={
                                    isMobile
                                        ? "xs"
                                        : "md"
                                }
                            />

                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                leftSection={
                                    <Lock size={18} />
                                }
                                radius="lg"
                                key={signinForm.key(
                                    "password"
                                )}
                                {...signinForm.getInputProps(
                                    "password"
                                )}
                                mb="md"
                                size={
                                    isMobile
                                        ? "xs"
                                        : "md"
                                }
                            />

                            <Group
                                justify="space-between"
                                align="center"
                                mb="md"
                            >
                                <Checkbox
                                    label="Remember me"
                                    {...signinForm.getInputProps(
                                        "rememberMe",
                                        {
                                            type: "checkbox",
                                        }
                                    )}
                                    size={
                                        isMobile
                                            ? "xs"
                                            : "md"
                                    }
                                />

                                <Anchor
                                    component="button"
                                    type="button"
                                    onClick={
                                        handleForgotPassword
                                    }
                                    size={
                                        isMobile
                                            ? "xs"
                                            : "md"
                                    }
                                >
                                    Forgot Password?
                                </Anchor>
                            </Group>

                            {signinError && (
                                <Text
                                    c="red"
                                    size="sm"
                                    mb="md"
                                >
                                    {signinError}
                                </Text>
                            )}

                            <Flex
                                direction="column"
                                gap="md"
                                w="100%"
                                mt="md"
                            >
                                <Button
                                    variant="outline"
                                    radius="lg"
                                    type="submit"
                                    loading={
                                        signinLoading
                                    }
                                    size={
                                        isMobile
                                            ? "xs"
                                            : "md"
                                    }
                                >
                                    Sign In
                                </Button>

                                <Divider
                                    label="OR"
                                    labelPosition="center"
                                />

                                <Button
                                    variant="outline"
                                    radius="lg"
                                    type="button"
                                    onClick={() =>
                                        handleGoogleAuth(
                                            "signin"
                                        )
                                    }
                                    size={
                                        isMobile
                                            ? "xs"
                                            : "md"
                                    }
                                >
                                    Continue with Google
                                </Button>
                            </Flex>
                        </form>
                    )}

                    {/* ========================= */}
                    {/* SIGN UP */}
                    {/* ========================= */}

                    {value === "signup" && (
                        <form
                            onSubmit={signupForm.onSubmit(
                                handleSignUp
                            )}
                        >
                            <Flex
                                direction="row"
                                gap="md"
                                w="100%"
                                justify="space-between"
                                mb="md"
                            >
                                <TextInput
                                    label="First Name"
                                    placeholder="Enter your first name"
                                    leftSection={
                                        <User size={18} />
                                    }
                                    radius="lg"
                                    w="100%"
                                    key={signupForm.key(
                                        "firstName"
                                    )}
                                    {...signupForm.getInputProps(
                                        "firstName"
                                    )}
                                    size={
                                        isMobile
                                            ? "xs"
                                            : "md"
                                    }
                                />

                                <TextInput
                                    label="Last Name"
                                    placeholder="Enter your last name"
                                    leftSection={
                                        <User size={18} />
                                    }
                                    radius="lg"
                                    w="100%"
                                    key={signupForm.key(
                                        "lastName"
                                    )}
                                    {...signupForm.getInputProps(
                                        "lastName"
                                    )}
                                    size={
                                        isMobile
                                            ? "xs"
                                            : "md"
                                    }
                                />
                            </Flex>

                            <TextInput
                                label="Email"
                                placeholder="Enter email"
                                leftSection={
                                    <Mail size={18} />
                                }
                                radius="lg"
                                key={signupForm.key(
                                    "email"
                                )}
                                {...signupForm.getInputProps(
                                    "email"
                                )}
                                mb="md"
                                size={
                                    isMobile
                                        ? "xs"
                                        : "md"
                                }
                            />

                            <Popover
                                opened={popoverOpened}
                                position="bottom"
                                width="target"
                                transitionProps={{
                                    transition: "pop",
                                }}
                            >
                                <Popover.Target>
                                    <div
                                        onFocusCapture={() =>
                                            setPopoverOpened(
                                                true
                                            )
                                        }
                                        onBlurCapture={() =>
                                            setPopoverOpened(
                                                false
                                            )
                                        }
                                    >
                                        <PasswordInput
                                            label="Password"
                                            placeholder="Enter password"
                                            leftSection={
                                                <Lock
                                                    size={18}
                                                />
                                            }
                                            radius="lg"
                                            mb="md"
                                            key={signupForm.key(
                                                "password"
                                            )}
                                            {...signupForm.getInputProps(
                                                "password"
                                            )}
                                            onChange={(
                                                event
                                            ) => {
                                                const password =
                                                    event
                                                        .currentTarget
                                                        .value;

                                                setSignupPassword(
                                                    password
                                                );

                                                signupForm.setFieldValue(
                                                    "password",
                                                    password,
                                                    {
                                                        forceUpdate:
                                                            false,
                                                    }
                                                );

                                                signupForm.validateField(
                                                    "confirmPassword"
                                                );
                                            }}
                                            size={
                                                isMobile
                                                    ? "xs"
                                                    : "md"
                                            }
                                        />
                                    </div>
                                </Popover.Target>

                                <Popover.Dropdown>
                                    <Progress
                                        color={color}
                                        value={strength}
                                        size={5}
                                        mb="xs"
                                    />

                                    <PasswordRequirement
                                        label="Includes at least 6 characters"
                                        meets={
                                            signupPassword.length >
                                            5
                                        }
                                    />

                                    {requirements.map(
                                        (
                                            requirement,
                                            index
                                        ) => (
                                            <PasswordRequirement
                                                key={index}
                                                label={
                                                    requirement.label
                                                }
                                                meets={requirement.re.test(
                                                    signupPassword
                                                )}
                                            />
                                        )
                                    )}
                                </Popover.Dropdown>
                            </Popover>

                            <PasswordInput
                                label="Confirm Password"
                                placeholder="Confirm password"
                                leftSection={
                                    <Lock size={18} />
                                }
                                radius="lg"
                                key={signupForm.key(
                                    "confirmPassword"
                                )}
                                {...signupForm.getInputProps(
                                    "confirmPassword"
                                )}
                                mb="md"
                                size={
                                    isMobile
                                        ? "xs"
                                        : "md"
                                }
                            />

                            {signupError && (
                                <Text
                                    c="red"
                                    size="sm"
                                    mb="md"
                                    fz={{
                                        base: "xs",
                                        md: "sm",
                                    }}
                                >
                                    {signupError}
                                </Text>
                            )}

                            <Flex
                                direction="column"
                                gap="md"
                                w="100%"
                                mt="lg"
                            >
                                <Button
                                    variant="outline"
                                    radius="lg"
                                    type="submit"
                                    loading={
                                        signupLoading
                                    }
                                    size={
                                        isMobile
                                            ? "xs"
                                            : "md"
                                    }
                                >
                                    Sign Up
                                </Button>

                                <Divider
                                    label="Or"
                                    labelPosition="center"
                                />

                                <Button
                                    variant="outline"
                                    radius="lg"
                                    type="button"
                                    onClick={() =>
                                        handleGoogleAuth(
                                            "signup"
                                        )
                                    }
                                >
                                    Sign Up with Google
                                </Button>
                            </Flex>
                        </form>
                    )}
                </Flex>
            </Flex>
        </MantineProvider>
    );
}