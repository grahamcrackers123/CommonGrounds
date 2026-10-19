
"use client";

import {
    Button,
    Container,
    Paper,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm({
        mode: "uncontrolled",
        initialValues: {
            email: "",
        },
        validate: {
            email: (value) =>
                emailRegex.test(value)
                    ? null
                    : "Please enter a valid email address",
        },
    });

    const handleBacktoSignin = () => {
        router.push("/access");
    };

    
    const handleSendResetLink = async (values: { email: string }) => {
        setLoading(true);
        setErrorMessage("");

        try {
            const supabase = createClient();

            const { error } = await supabase.auth.resetPasswordForEmail(
                values.email.trim(),
                {
                    redirectTo: `${window.location.origin}/reset-password`,
                }
            );

            if (error) {
                setErrorMessage(
                    "We couldn't process your request. Please try again."
                );
                return;
            }

            setSubmitted(true);
        } catch {
            setErrorMessage(
                "Something went wrong. Please check your connection and try again."
            );
        } finally {
            setLoading(false);
        }
    };
             
    return (
        <Container
            fluid
            px="md"
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
            }}
        >
            <Paper
                w={350}
                radius="lg"
                p="md"
                withBorder
                style={{
                    backgroundColor: "#EAF3FF",
                    borderColor: "lightblue",
                    borderWidth: "2px",
                }}
            >
                <Title
                    order={2}
                    ta="center"
                    mb="md"
                    style={{ fontWeight: 700, fontSize: "28px" }}
                >
                    Forgot Password
                </Title>

                {submitted ? (
                    <>
                        <Text size="sm" ta="center" mt="md">
                            If an account exists for that email address, a
                            password-reset link will be sent. Please check your
                            inbox and spam folder.
                        </Text>

                        <Button
                            fullWidth
                            mt="xl"
                            variant="outline"
                            radius="lg"
                            onClick={handleBacktoSignin}
                        >
                            Back to Sign In
                        </Button>
                    </>
                ) : (
                    <form
                        onSubmit={form.onSubmit(handleSendResetLink)}
                    >
                        <TextInput
                            label="Email"
                            placeholder="your@email.com"
                            leftSection={<Mail size={18} />}
                            radius="lg"
                            mb="md"
                            key={form.key("email")}
                            {...form.getInputProps("email")}
                        />

                        {errorMessage && (
                            <Text size="sm" c="red" mb="md">
                                {errorMessage}
                            </Text>
                        )}

                        <Button
                            fullWidth
                            type="submit"
                            mb="md"
                            radius="lg"
                            loading={loading}
                        >
                            Send Reset Link
                        </Button>

                        <Button
                            fullWidth
                            variant="outline"
                            radius="lg"
                            onClick={handleBacktoSignin}
                        >
                            Back to Sign In
                        </Button>
                    </form>
                )}
            </Paper>
        </Container>
    );
}
