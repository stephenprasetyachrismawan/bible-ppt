/**
 * Konfigurasi untuk Google Gemini API
 * API key diambil dari variabel lingkungan .env
 */

// Ambil API key dari environment variables
// Di Next.js, variabel lingkungan yang ingin diakses di client-side harus menggunakan prefiks NEXT_PUBLIC_
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export { GEMINI_API_KEY }; 