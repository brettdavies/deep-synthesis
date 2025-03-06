import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    fontFamily: {
      sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      serif: ["ui-serif", "Georgia", "serif"],
      mono: ["ui-monospace", "SFMono-Regular", "monospace"],
    },
    spacing: {
      0: '0px',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      8: '2rem',
      10: '2.5rem',
      12: '3rem',
      16: '4rem',
      20: '5rem',
      24: '6rem',
      32: '8rem',
      40: '10rem',
      48: '12rem',
      56: '14rem',
      64: '16rem',
      px: '1px',
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        "outline-ring": "var(--ring)",
      },
      textColor: {
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-muted": "var(--sidebar-muted)",
      },
      borderColor: {
        "sidebar-border": "var(--sidebar-border)",
      },
      ringColor: {
        "sidebar-ring": "var(--sidebar-ring)",
      },
      outlineColor: {
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(function({ addUtilities }) {
      const newUtilities = {
        '.outline-ring': {
          'outline-color': 'var(--ring)',
        },
        '.outline-ring\\/10': {
          'outline-color': 'color-mix(in srgb, var(--ring) 10%, transparent)',
        },
        '.outline-ring\\/20': {
          'outline-color': 'color-mix(in srgb, var(--ring) 20%, transparent)',
        },
        '.outline-ring\\/30': {
          'outline-color': 'color-mix(in srgb, var(--ring) 30%, transparent)',
        },
        '.outline-ring\\/40': {
          'outline-color': 'color-mix(in srgb, var(--ring) 40%, transparent)',
        },
        '.outline-ring\\/50': {
          'outline-color': 'color-mix(in srgb, var(--ring) 50%, transparent)',
        },
        '.outline-ring\\/60': {
          'outline-color': 'color-mix(in srgb, var(--ring) 60%, transparent)',
        },
        '.outline-ring\\/70': {
          'outline-color': 'color-mix(in srgb, var(--ring) 70%, transparent)',
        },
        '.outline-ring\\/80': {
          'outline-color': 'color-mix(in srgb, var(--ring) 80%, transparent)',
        },
        '.outline-ring\\/90': {
          'outline-color': 'color-mix(in srgb, var(--ring) 90%, transparent)',
        },
      };
      addUtilities(newUtilities);
    }),
  ],
};

export default config;
