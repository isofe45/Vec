import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial'],
      },
      colors: {
        bg: '#0B0D12',
        panel: '#0F1420',
        stroke: 'rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
