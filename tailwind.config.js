const animate = require('tailwindcss-animate');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind CSS v4.x - Most configuration is now in src/index.css using @theme directive
  // This file is kept for plugin configuration and advanced customization
  
  darkMode: ['class'],

  content: [
    './pages/**/*.{ts,tsx,vue}',
    './components/**/*.{ts,tsx,vue}',
    './app/**/*.{ts,tsx,vue}',
    './src/**/*.{ts,tsx,vue}',
  ],

  plugins: [animate],
};
