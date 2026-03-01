/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Platform colors
                replit: '#F26207',
                lovable: '#5B4EE4',
                cursor: '#1A1A1A',

                // Brand colors
                primary: '#3B82F6', // Blue-500
                secondary: '#10B981', // Green-500
                accent: '#8B5CF6', // Purple-500
                danger: '#EF4444', // Red-500
                warning: '#F59E0B', // Amber-500

                // Backgrounds
                dark: '#030712', // Gray-950
                'dark-lighter': '#111827', // Gray-900
                'dark-card': '#1F2937', // Gray-800
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 3s infinite',
            }
        },
    },
    plugins: [],
}
