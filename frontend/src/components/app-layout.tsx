
"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";
import { FocusSessionProvider } from "@/components/focus-session-provider";
import { Container } from "@mantine/core";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/access" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/callback";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <FocusSessionProvider>
      <Container fluid p={0}>
        <Navbar>{children}</Navbar>
      </Container>
    </FocusSessionProvider>
  );
}
