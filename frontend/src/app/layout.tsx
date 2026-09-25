import Navbar from '@/components/navbar';
import ThemeProvider from '@/components/theme-provider';
import {
  Container,
  createTheme,
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

const theme = createTheme({
  primaryColor: 'brand',

  colors: {
    brand: [
      '#F0F2FF',
      '#E1E5FF',
      '#C3CAFF',
      '#A5AFFF',
      '#8794F5',
      '#6F80E8',
      '#5C6FDA',
      '#4F61C7',
      '#4052B3',
      '#33449F',
    ],

    dark: [
      '#FFFFFF',
      '#F8FAFC',
      '#F1F5F9',
      '#E2E8F0',
      '#CBD5E1',
      '#475569',
      '#334155',
      '#1E293B',
      '#111827',
      '#000000',
    ],
  },
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
          theme={theme}
          defaultColorScheme="light"
        >
          <ThemeProvider>
            <ModalsProvider>
              <Notifications />

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