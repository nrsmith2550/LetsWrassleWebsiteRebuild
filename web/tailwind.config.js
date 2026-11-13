import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(here, 'index.html'), path.join(here, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        ink: '#1b1d20',
        orange: { DEFAULT: '#e8731f', dark: '#c85f12' },
        bone: '#f6f3ef',
        // Storefront neutrals (matched to letswrassleapparel.com)
        mist: '#f5f5f5',
        fog: '#ececec',
        slate: '#22282e',
        flag: '#e5484d',
        // Admin hub palette (modeled on the IONOS store portal)
        ionos: {
          top: '#0f3b8c',
          side: '#1d5fce',
          sideActive: '#4a90f0',
          sideDeep: '#1650b0',
          page: '#f1f2f5',
          text: '#1c2b4a',
          muted: '#6b768c',
          line: '#dfe3ea',
          primary: '#3358e6',
          primaryDark: '#2644c4',
          green: '#2f9e44',
          amber: '#c77d0a',
          red: '#d6393e',
        },
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Impact', 'Arial Black', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
