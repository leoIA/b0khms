// PostCSS configuration
// Excludes Tailwind plugin in test environment to avoid Vitest compatibility issues

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: process.env.NODE_ENV === 'test' 
    ? [] 
    : ['@tailwindcss/postcss'],
};

export default config;
