"use client";

import { Button, Container, Paper, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Mail } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ForgotPasswordPage() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            email: ''
        },
        validate: {
            email: (value) => (emailRegex.test(value) ? null : "Please enter a valid email address"),
        },
    });

    const handleBacktoSignin = async () => {
        router.push("/access");
    };

    const handleSendResetLink = async () => {
        setSubmitted(true);
    };

    return (
        <Container fluid px="md" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Paper
                w={350}
                radius="lg"
                p="md"
                withBorder
                style={{ backgroundColor: '#EAF3FF', borderColor: 'lightblue', borderWidth: '2px' }}
            >
                <Title
                    order={2}
                    ta="center"
                    mb="md"
                    style={{ fontWeight: 700, fontSize: '28px' }}
                >
                    Forgot Password
                </Title>

                {submitted ? (
                    <>
                        <Text size="sm" ta="center" c="dimmed" mt="md">
                            The reset link has been sent to your email. Kindly check your inbox.
                        </Text>
                        <Button fullWidth mt='xl' variant='outline' radius='lg' onClick={handleBacktoSignin}>
                            Back to Sign In
                        </Button>
                    </>
                ) : (
                    <>
                        <form onSubmit={form.onSubmit(handleSendResetLink)}>
                            <TextInput
                                label="Email"
                                placeholder="your@email.com"
                                leftSection={<Mail size={18} />}
                                radius="lg"
                                mb="md"
                                key={form.key("email")}
                                {...form.getInputProps("email")}
                            />
                            <Button fullWidth type="submit" mb="md" radius='lg'>
                                Send Reset Link
                            </Button>
                            <Button fullWidth variant='outline' radius='lg' onClick={handleBacktoSignin}>
                                Back to Sign In
                            </Button>
                        </form>
                    </>
                )}
            </Paper>
        </Container>
    );
}