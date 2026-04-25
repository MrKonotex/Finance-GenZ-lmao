import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0A0A0C',
        surface: '#131316',
        muted: '#1C1C21',
        accent: '#00C2CB',
        'accent-dim': '#00989F',
        text1: '#F0F0F0',
        text2: '#9B9BA8',
        gain: '#00C27A',
        loss: '#FF4B4B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
