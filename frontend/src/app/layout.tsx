import Navbar from '@/components/navbar';
import RealtimeSync from '@/components/realtime-sync';
import ThemeProvider from '@/components/theme-provider';
import { commonGroundsTheme } from '@/theme/commonGroundsTheme';
import {
  Container,
  mantineHtmlProps,
  MantineProvider,
} from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CommonGrounds',
  description: 'CommonGrounds Student Learning Platform',
};

export default function RootLayout({
  children,
}: LayoutProps<'/'>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head />

      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <MantineProvider
          theme={commonGroundsTheme}
          defaultColorScheme="light"
        >
          <ThemeProvider>
            <ModalsProvider>
              <Notifications />
              <RealtimeSync />
              <Container fluid p={0}>
                <Navbar>
                  {children}
                </Navbar>
              </Container>
            </ModalsProvider>
          </ThemeProvider>
        </MantineProvider>
      </body>
    </html>
  );
}