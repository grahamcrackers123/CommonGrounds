"use client";

import { createClient } from "@/lib/supabase/client";
import { useMantineColorScheme } from "@mantine/core";
import { useEffect, useRef } from "react";

export default function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { setColorScheme } = useMantineColorScheme();

    const loadedUserId = useRef<string | null>(null);

    useEffect(() => {
        const supabase = createClient();

        const loadUserTheme = async (userId: string) => {
            // Don't reload the database preference
            // if this user's theme has already been loaded.
            if (loadedUserId.current === userId) {
                return;
            }

            const { data: profile, error } =
                await supabase
                    .from("profiles")
                    .select("theme_preference")
                    .eq("id", userId)
                    .single();

            if (error) {
                console.error(
                    "Could not load theme preference:",
                    error
                );
                return;
            }

            if (
                profile?.theme_preference === "dark" ||
                profile?.theme_preference === "light"
            ) {
                setColorScheme(profile.theme_preference);
            }

            loadedUserId.current = userId;
        };

        // Check the current authentication state.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.user) {
                setColorScheme("light");
                loadedUserId.current = null;
                return;
            }

            void loadUserTheme(session.user.id);
        });

        // Listen for login/logout changes.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === "SIGNED_OUT" || !session?.user) {
                    // Logged-out pages should always use Light mode.
                    setColorScheme("light");
                    loadedUserId.current = null;
                    return;
                }

                // Let the auth event finish first.
                // Then load the user's saved theme.
                setTimeout(() => {
                    void loadUserTheme(session.user.id);
                }, 0);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [setColorScheme]);

    return <>{children}</>;
}