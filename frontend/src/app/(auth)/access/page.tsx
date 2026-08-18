"use client";

import { Anchor, Box, Button, Checkbox, Divider, Flex, Group, PasswordInput, Popover, Progress, SegmentedControl, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Check, Lock, Mail, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* For password validation */
function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
    return (
        <Text c={meets ? 'teal' : 'red'} style={{ display: 'flex', alignItems: 'center' }} mt={7} size="sm">
            {meets ? <Check size={14} /> : <X size={14} />}
            <Box ml={10}>{label}</Box>
        </Text>
    );
}

const requirements = [
    { re: /[0-9]/, label: 'Includes number' },
    { re: /[a-z]/, label: 'Includes lowercase letter' },
    { re: /[A-Z]/, label: 'Includes uppercase letter' },
    { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
];

function getStrength(password: string) {
    let multiplier = password.length > 5 ? 0 : 1;
    requirements.forEach((requirement) => {
        if (!requirement.re.test(password)) multiplier += 1;
    });
    return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
}

export default function AccessPage() {
    const [value, setValue] = useState('signin');
    const router = useRouter();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const [popoverOpened, setPopoverOpened] = useState(false);
    const [signupPassword, setSignupPassword] = useState('');
    const strength = getStrength(signupPassword);
    const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';

    /* Form validation for Sign In */
    const signinForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            email: '',
            password: '',
            rememberMe: false
        },

        validate: {
            email: (value) => (emailRegex.test(value) ? null : 'Invalid email'),
            password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
        }
    });

    /* Form validation for Sign Up */
    const signupForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: ''
        },

        validate: {
            firstName: (value) => (value.length < 2 ? 'First name must be at least 2 letters' : null),
            lastName: (value) => (value.length < 2 ? 'Last name must be at least 2 letters' : null),
            email: (value) => (emailRegex.test(value) ? null : 'Invalid email'),
            password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
            confirmPassword: (value, values) => (value !== values.password ? 'Passwords do not match' : null),
        }
    });

    const handleForgotPassword = async () => {
        router.push("/forgot-password");
    };

    return (
        <Flex direction="row" h="100vh" w="100%">
            <Flex direction="column" gap="md" h="100vh" w="50%" p="md" />

            <Flex direction="column" gap="md" h="100vh" w="50%" p="md" justify="center" bg="#EAF3FF">
                <Flex justify="center" mb="xl">
                    <Title order={1}>
                        CommonGrounds
                    </Title>
                </Flex>

                <Group justify="center" align="center" gap="md">
                    {value === "signin" ? (
                        <Flex direction="column" align="center">
                            <Text fw="bold" size="xl">
                                Welcome back!
                            </Text>
                            <Text color="dimmed" size="xl">
                                Please enter your details.
                            </Text>
                        </Flex>
                    ) : (
                        <Text color="dimmed" size="xl">
                            Create an account to get started!
                        </Text>
                    )}

                    <SegmentedControl
                        color="blue"
                        bg={"white"}
                        radius="lg"
                        autoContrast data={[
                            { label: "Sign In", value: "signin" },
                            { label: "Sign Up", value: "signup" }
                        ]}
                        value={value}
                        onChange={setValue}
                        w="100%"
                    />
                </Group>

                {value === "signin" ? (
                    <form onSubmit={signinForm.onSubmit(() => router.push("/dashboard"))}>
                        <>
                            <TextInput
                                label="Email"
                                placeholder="Enter your email"
                                leftSection={<Mail size={18} />}
                                radius="lg"
                                key={signinForm.key('email')}
                                {...signinForm.getInputProps('email')}
                                mb="md"
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                leftSection={<Lock size={18} />}
                                radius="lg"
                                key={signinForm.key('password')}
                                {...signinForm.getInputProps('password')}
                                mb="md"
                            />
                            <Group justify="space-between" align="center" mb="md">
                                <Checkbox
                                    label="Remember me"
                                    {...signinForm.getInputProps('rememberMe', { type: 'checkbox' })}
                                />
                                <Anchor component="button" type="button" size="sm" onClick={handleForgotPassword}>
                                    Forgot Password?
                                </Anchor>
                            </Group>
                            <Flex direction="column" gap="md" w="100%" mt="md">
                                <Button variant="outline" radius="lg" type="submit">
                                    Sign In
                                </Button>
                                <Divider label="OR" labelPosition="center" />
                                <Button variant="outline" radius="lg">
                                    Continue with Google
                                </Button>
                            </Flex>
                        </>
                    </form>
                ) : null}

                {value === "signup" ? (
                    <>
                        <form onSubmit={signupForm.onSubmit(() => router.push("/dashboard"))}>
                            <Flex direction="row" gap="md" w="100%" justify="space-between" mb="md">
                                <TextInput
                                    label="First Name"
                                    placeholder="Enter your first name"
                                    leftSection={<User size={18} />}
                                    radius="lg"
                                    w="100%"
                                    key={signupForm.key('firstName')}
                                    {...signupForm.getInputProps('firstName')}
                                />
                                <TextInput
                                    label="Last Name"
                                    placeholder="Enter your last name"
                                    leftSection={<User size={18} />}
                                    radius="lg"
                                    w="100%"
                                    key={signupForm.key('lastName')}
                                    {...signupForm.getInputProps('lastName')}
                                />
                            </Flex>

                            <TextInput
                                label="Email"
                                placeholder="Enter email"
                                leftSection={<Mail size={18} />}
                                radius="lg"
                                key={signupForm.key('email')}
                                {...signupForm.getInputProps('email')}
                                mb="md"
                            />
                            <Popover opened={popoverOpened} position="bottom" width="target" transitionProps={{ transition: 'pop' }}>
                                <Popover.Target>
                                    <div onFocusCapture={() => setPopoverOpened(true)} onBlurCapture={() => setPopoverOpened(false)}>
                                        <PasswordInput
                                            label="Password"
                                            placeholder="Enter password"
                                            leftSection={<Lock size={18} />}
                                            radius="lg"
                                            mb="md"
                                            key={signupForm.key('password')}
                                            {...signupForm.getInputProps('password')}
                                            onChange={(event) => {
                                                setSignupPassword(event.currentTarget.value);
                                                signupForm.setFieldValue('password', event.currentTarget.value);
                                                signupForm.validateField('confirmPassword')
                                            }}
                                        />
                                    </div>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <Progress color={color} value={strength} size={5} mb="xs" />
                                    <PasswordRequirement label="Includes at least 6 characters" meets={signupPassword.length > 5} />
                                    {requirements.map((requirement, index) => (
                                        <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(signupPassword)} />
                                    ))}
                                </Popover.Dropdown>
                            </Popover>
                            <PasswordInput
                                label="Confirm Password"
                                placeholder="Confirm password"
                                leftSection={<Lock size={18} />}
                                radius="lg"
                                key={signupForm.key('confirmPassword')}
                                {...signupForm.getInputProps('confirmPassword')}
                                mb="md"
                            />
                            <Flex direction="column" gap="md" w="100%" mt="lg">
                                <Button variant="outline" radius="lg" type="submit">
                                    Sign Up
                                </Button>
                                <Divider label="Or" labelPosition="center" />
                                <Button variant="outline" radius="lg">
                                    Sign Up with Google
                                </Button>
                            </Flex>
                        </form>
                    </>
                ) : null}
            </Flex>
        </Flex >
    );
}