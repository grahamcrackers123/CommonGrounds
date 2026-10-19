"use client";

import {
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validRecovery, setValidRecovery] = useState(false);
  const [success, setSuccess] = useState(false);

  const verificationPromise = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    let active = true;

    async function verifyRecoveryLink() {
      const supabase = createClient();
      const code = searchParams.get("code");

      if (!verificationPromise.current) {
        verificationPromise.current = (async () => {
          if (code) {
            const { error } =
              await supabase.auth.exchangeCodeForSession(code);

            if (error) {
              // Another effect may already have exchanged this
              // one-time code. Check whether the session exists.
              const { data } = await supabase.auth.getSession();

              return !!data.session;
            }

            return true;
          }

          // Support recovery links that establish a session
          // without a code query parameter.
          const { data, error } = await supabase.auth.getSession();

          return !error && !!data.session;
        })();
      }

      try {
        const isValid = await verificationPromise.current;

        if (!active) return;

        if (isValid) {
          setValidRecovery(true);

          // Remove the one-time code from the address bar.
          if (code) {
            window.history.replaceState(
              window.history.state,
              "",
              "/reset-password"
            );
          }
        } else {
          setErrorMessage(
            "This password-reset link is invalid or has expired. Please request a new one."
          );
        }
      } catch {
        if (!active) return;

        setErrorMessage(
          "We couldn't verify this link. Please request a new one."
        );
      } finally {
        if (active) {
          setVerifying(false);
        }
      }
    }

    void verifyRecoveryLink();

    return () => {
      active = false;
    };
  }, [searchParams]);

  async function handleResetPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setValidRecovery(false);
        setErrorMessage(
          "Your recovery session has expired. Please request a new reset link."
        );
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({ password });

      if (updateError) {
        setErrorMessage(
          updateError.message ||
            "We couldn't update your password. Please try again."
        );
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMessage(
        "Something went wrong. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

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
          Reset Password
        </Title>

        {verifying ? (
          <Text ta="center" size="sm" py="md">
            Verifying your password-reset link...
          </Text>
        ) : success ? (
          <>
            <Text ta="center" c="green" mt="md" size="sm">
              Your password has been updated successfully.
              You can now sign in with your new password.
            </Text>

            <Button
              fullWidth
              mt="xl"
              radius="lg"
              onClick={() => router.replace("/access")}
            >
              Back to Sign In
            </Button>
          </>
        ) : validRecovery ? (
          <form onSubmit={handleResetPassword}>
            <PasswordInput
              label="New Password"
              placeholder="Enter your new password"
              value={password}
              onChange={(event) =>
                setPassword(event.currentTarget.value)
              }
              minLength={6}
              required
              mb="md"
              radius="lg"
              autoComplete="new-password"
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.currentTarget.value)
              }
              minLength={6}
              required
              mb="md"
              radius="lg"
              autoComplete="new-password"
            />

            {errorMessage && (
              <Text size="sm" c="red" mb="md">
                {errorMessage}
              </Text>
            )}

            <Button
              fullWidth
              type="submit"
              radius="lg"
              loading={loading}
              mb="md"
            >
              Reset Password
            </Button>

            <Button
              fullWidth
              variant="outline"
              radius="lg"
              onClick={() => router.replace("/access")}
              disabled={loading}
            >
              Back to Sign In
            </Button>
          </form>
        ) : (
          <>
            <Text size="sm" c="red" ta="center" mt="md">
              {errorMessage}
            </Text>

            <Button
              fullWidth
              mt="xl"
              radius="lg"
              onClick={() => router.replace("/forgot-password")}
            >
              Request a New Link
            </Button>
          </>
        )}
      </Paper>
    </Container>
  );
}