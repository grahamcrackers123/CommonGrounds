import { createTheme } from "@mantine/core";

/*
 * CommonGrounds brand palette, generated from #2F80ED.
 *
 * The built-in "blue" palette is intentionally overridden with
 * the same shades so every existing color="blue" component uses
 * the brand color in both light and dark mode.
 */
const brandBlue = [
  "#EEF5FE",
  "#E0ECFC",
  "#CBDFFB",
  "#ACCCF8",
  "#82B3F4",
  "#5999F1",
  "#2F80ED",
  "#286DC9",
  "#215AA6",
  "#184077",
] as const;

export const commonGroundsTheme = createTheme({
  primaryColor: "brand",

  // Use the exact brand shade in both modes so light and dark
  // render identical button/control colors.
  primaryShade: { light: 6, dark: 6 },

  colors: {
    brand: brandBlue,
    blue: brandBlue,

    dark: [
      "#FFFFFF",
      "#F8FAFC",
      "#F1F5F9",
      "#E2E8F0",
      "#CBD5E1",
      "#475569",
      "#334155",
      "#1E293B",
      "#111827",
      "#000000",
    ],
  },
});
