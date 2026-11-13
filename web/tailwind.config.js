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
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Impact', 'Arial Black', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
