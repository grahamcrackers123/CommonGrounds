import { createTheme } from "@mantine/core";

export const commonGroundsTheme = createTheme({
  primaryColor: "cgBlue",

  colors: {
    cgBlue: [
      "#eef1ff",
      "#dfe4ff",
      "#c5cdff",
      "#a8b4ff",
      "#8b9eff",
      "#7285ee",
      "#5c6fda",
      "#4f60c0",
      "#4352a5",
      "#36458c",
    ],
  },

  primaryShade: 6,

  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",

  headings: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: "700",
  },

  defaultRadius: "md",

  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },

    Card: {
      defaultProps: {
        radius: "lg",
      },
    },

    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },

    Select: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});