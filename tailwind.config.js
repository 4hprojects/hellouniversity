/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './routes/**/*.js',
    './app/**/*.js',
    './public/**/*.html',
    './public/**/*.js',
    '!./public/dist/**'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
