// tailwind.config.js hoặc tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
export default { // Hoặc module.exports = { nếu là file .cjs
    content: [
      "./index.html", // File HTML gốc
      "./src/**/*.{js,ts,jsx,tsx}", // *** Quan trọng: Đảm bảo dòng này có và đúng ***
      // Bao gồm cả các file trong pages nếu cần: "./src/pages/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // Bạn có thể đã thêm các màu primary, secondary ở đây
        colors: {
          primary: { // Ví dụ
            50: '#f0f9ff', 
            // ... các sắc thái khác
            600: '#0284c7',
            700: '#0369a1',
          },
          secondary: { // Ví dụ
            100: '#e0f2fe',
            // ... các sắc thái khác
            600: '#0ea5e9',
            700: '#0ea5e9', // Giả sử giống 600
          },
        },
        // Bạn có thể đã thêm font-family hoặc animation ở đây
        fontFamily: {
           display: ['Your Display Font', 'sans-serif'], // Ví dụ
        },
        keyframes: {
           // Ví dụ keyframes cho gradient, float,...
           'slide-in-right': {
             '0%': { transform: 'translateX(100%)', opacity: '0' },
             '100%': { transform: 'translateX(0)', opacity: '1' }
           },
           'slide-out-right': {
             '0%': { transform: 'translateX(0)', opacity: '1' },
             '100%': { transform: 'translateX(100%)', opacity: '0' }
           },
           'fade-in': {
             '0%': { opacity: '0' },
             '100%': { opacity: '1' }
           },
           'fade-out': {
             '0%': { opacity: '1' },
             '100%': { opacity: '0' }
           },
           'cursor-blink': {
             '0%, 100%': { opacity: 1 },
             '50%': { opacity: 0 }
           }
        },
        animation: {
           // Ví dụ animation
           'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
           'slide-out-right': 'slide-out-right 0.3s ease-in forwards',
           'fade-in': 'fade-in 0.2s ease-out forwards',
           'fade-out': 'fade-out 0.2s ease-in forwards',
           'cursor-blink': 'cursor-blink 0.8s ease-in-out infinite'
        }
      },
    },
    plugins: [],
  }